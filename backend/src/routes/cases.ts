// backend/src/routes/cases.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { format as formatCsv } from 'fast-csv'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseStatus, Cargo, LogAction, CaseOrigin } from '@prisma/client'

// --- FUNÇÕES AUXILIARES ---

const stripTime = (date: Date | string): Date => {
  const d = new Date(date)
  // Define hora para meio-dia UTC para evitar problemas de fuso horário (-3h) mudando o dia
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

const calculateUrgencyWeight = (urgencia: string): number => {
  const term = urgencia.trim()
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2
  return 1
}

const formatDateForCsv = (date: Date | null | undefined): string => {
  return date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'
}

// Função pura para detectar alterações (Audit Log)
function detectChanges(oldData: any, newData: any) {
  const changes: Record<string, { from: any, to: any }> = {}
  const ignoreFields = ['updatedAt', 'createdAt', 'pesoUrgencia', 'numeroSei', 'linkSei', 'observacoes', 'beneficios', 'criadoPorId', 'id'] 

  for (const key in newData) {
    if (ignoreFields.includes(key)) continue
    let val1 = oldData[key]
    let val2 = newData[key]
    
    // Comparação de datas simplificada
    if ((val1 instanceof Date || typeof val1 === 'string') && (val2 instanceof Date || typeof val2 === 'string')) {
      const d1 = new Date(val1); const d2 = new Date(val2)
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        if (d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0]) continue
      }
    }
    
    if (val1 !== val2) { 
      if (!val1 && !val2) continue 
      changes[key] = { from: val1, to: val2 } 
    }
  }
  return changes
}

async function createLog(casoId: string, autorId: string, acao: LogAction, descricao: string, valorAnterior?: string | null, valorNovo?: string | null) {
  // Dispara e esquece (Fire and forget) para não bloquear a resposta da API
  prisma.caseLog.create({ 
    data: { casoId, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null } 
  }).catch(err => console.error('Falha ao criar log:', err))
}

// Lógica de Permissões de Visualização
function buildActiveCaseWhereClause(user: { cargo: string; sub: string }) {
  const cargo = user.cargo
  
  // Gerente: Vê casos novos aguardando distribuição
  if (cargo === Cargo.Gerente) {
    return { status: CaseStatus.AGUARDANDO_DISTRIBUICAO }
  }
  // Agente Social: Vê seus casos em acolhida
  if (cargo === Cargo.Agente_Social) {
    return {
      agenteAcolhidaId: user.sub,
      status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
    }
  }
  // Especialista: Vê seus casos em acompanhamento
  if (cargo === Cargo.Especialista) {
    return {
      especialistaPAEFIId: user.sub,
      status: { 
        in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] 
      }
    }
  }
  return {} 
}

// --- SCHEMAS ZOD (REUTILIZÁVEIS) ---

const caseBaseSchema = z.object({
  nomeCompleto: z.string().min(3),
  cpf: z.string().length(11),
  nascimento: z.coerce.date(),
  sexo: z.string(),
  telefone: z.string(),
  endereco: z.string(),
  dataEntrada: z.coerce.date(),
  urgencia: z.string(),
  violacao: z.string(),
  categoria: z.string(),
  orgaoDemandante: z.string(),
  origem: z.nativeEnum(CaseOrigin).default(CaseOrigin.ESPONTANEA),
  agenteAcolhidaId: z.string().uuid().nullable().optional(),
  numeroSei: z.string().nullable().optional(),
  linkSei: z.string().url().nullable().optional().or(z.literal('')),
  observacoes: z.string().nullable().optional(),
})

// --- ROTAS ---

export async function caseRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Auth
  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { await reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [POST] CRIAR CASO
  server.post('/cases', {
    schema: {
      tags: ['Casos'],
      summary: 'Criar um novo caso',
      body: caseBaseSchema,
      response: {
        201: z.object({ id: z.string(), nomeCompleto: z.string() }) // Resposta parcial para performance
      }
    }
  }, async (request, reply) => {
    const data = request.body
    const userId = request.user.sub
    const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

    // Ajuste de datas e campos nulos
    const casoData = {
      ...data,
      nascimento: stripTime(data.nascimento),
      dataEntrada: stripTime(data.dataEntrada),
      pesoUrgencia,
      criadoPorId: userId,
      numeroSei: data.numeroSei ?? null,
      linkSei: data.linkSei || null,
      observacoes: data.observacoes ?? null,
      beneficios: [],
      // Se Agente criar, já vincula a ele? Depende da regra, aqui mantivemos genérico
    }

    const novoCaso = await prisma.case.create({ data: casoData })

    cache.invalidate('manager_stats')
    await createLog(novoCaso.id, userId, LogAction.CRIACAO, `Caso criado via ${data.origem}`)

    return reply.status(201).send(novoCaso)
  })

  // 1.1 [PUT] EDITAR CASO
  server.put('/cases/:id', {
    schema: {
      tags: ['Casos'],
      summary: 'Editar dados cadastrais do caso',
      params: z.object({ id: z.string().uuid() }),
      body: caseBaseSchema.partial(), // Permite envio parcial se necessário, ou use o baseSchema
    }
  }, async (request, reply) => {
    const { id } = request.params
    const rawData = request.body
    const userId = request.user.sub

    const oldCase = await prisma.case.findUnique({ where: { id } })
    if (!oldCase) return reply.status(404).send({ message: 'Caso não encontrado.' })

    const data = { 
      ...rawData, 
      nascimento: rawData.nascimento ? stripTime(rawData.nascimento) : undefined, 
      dataEntrada: rawData.dataEntrada ? stripTime(rawData.dataEntrada) : undefined 
    }

    const pesoUrgencia = data.urgencia ? calculateUrgencyWeight(data.urgencia) : oldCase.pesoUrgencia

    const updatedCaso = await prisma.case.update({
      where: { id },
      data: {
        ...data,
        pesoUrgencia,
      },
    })

    cache.invalidate('manager_stats')
    
    // Log de auditoria
    const changes = detectChanges(oldCase, data)
    const keys = Object.keys(changes)
    if (keys.length > 0) {
      await createLog(id, userId, LogAction.OUTRO, `Editou ${keys.length} campos cadastrais.`, JSON.stringify(changes), null)
    }

    return reply.send(updatedCaso)
  })

  // 2. [GET] LISTAR CASOS (Busca Principal)
  server.get('/cases', {
    schema: {
      tags: ['Casos'],
      summary: 'Listar casos com paginação e filtros avançados',
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
        status: z.string().optional(), // Aceita "AGUARDANDO_ACOLHIDA,EM_ACOLHIDA"
        urgencia: z.string().optional(),
        violacao: z.string().optional(),
        categoria: z.string().optional(),
        sexo: z.string().optional(),
        view: z.enum(['my', 'all']).default('my').optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        agenteId: z.string().uuid().optional(),
        specialistId: z.string().uuid().optional(),
      })
    }
  }, async (request, reply) => {
    const { 
      search, page, pageSize, status, urgencia, violacao, 
      categoria, sexo, view, sortBy, sortOrder, agenteId, specialistId 
    } = request.query

    // Construção Dinâmica do Where
    let where: any = {}

    // 1. Escopo de Visibilidade
    if (agenteId) {
      where = { agenteAcolhidaId: agenteId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
    } else if (specialistId) {
      where = { especialistaPAEFIId: specialistId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }
    } else if (view === 'all') {
      where = { status: { not: CaseStatus.DESLIGADO } }
    } else {
      // Aplica regra de negócio baseada no Cargo do usuário logado
      const defaultFilters = buildActiveCaseWhereClause(request.user as any)
      where = { ...where, ...defaultFilters }
    }

    // 2. Filtro de Texto (Nome, CPF, Endereço)
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } },
            { endereco: { contains: search, mode: 'insensitive' } } 
          ]
        }
      ]
    }

    // 3. Filtros Específicos
    if (status && status !== 'all') {
      const statusList = status.split(',').map(s => s.trim())
      // Filtra apenas status válidos do Enum
      const validStatuses = statusList.filter(s => Object.values(CaseStatus).includes(s as CaseStatus))
      if (validStatuses.length > 0) where.status = { in: validStatuses }
    }

    if (urgencia && urgencia !== 'all') where.urgencia = urgencia
    if (violacao && violacao !== 'all') where.violacao = violacao
    if (categoria && categoria !== 'all') where.categoria = categoria
    if (sexo && sexo !== 'all') where.sexo = sexo

    // 4. Ordenação
    let orderBy: any = [{ pesoUrgencia: 'desc' }, { dataEntrada: 'asc' }]
    if (sortBy) {
      if (sortBy === 'urgencia') orderBy = { pesoUrgencia: sortOrder || 'desc' }
      else orderBy = { [sortBy]: sortOrder || 'asc' }
    }

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, 
        orderBy, 
        take: pageSize, 
        skip: (page - 1) * pageSize,
        include: { 
          agenteAcolhida: { select: { nome: true } }, 
          especialistaPAEFI: { select: { nome: true } } 
        },
      }),
      prisma.case.count({ where }),
    ])

    return reply.send({ 
      data: items, 
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } 
    })
  })

  // 3. [GET] LISTAR CASOS FECHADOS (Histórico)
  server.get('/cases/closed', {
    schema: {
      tags: ['Casos'],
      summary: 'Listar histórico de casos desligados',
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
      })
    }
  }, async (request, reply) => {
    const { search, page, pageSize } = request.query
    const where: any = { status: CaseStatus.DESLIGADO }

    if (search) {
      where.OR = [
        { nomeCompleto: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { endereco: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, 
        orderBy: { dataDesligamento: 'desc' }, 
        take: pageSize, 
        skip: (page - 1) * pageSize,
        include: {
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } },
        },
      }),
      prisma.case.count({ where }),
    ])

    return reply.send({ 
      data: items, 
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } 
    })
  })

  // 4. [GET] DETALHES DO CASO (Completo)
  server.get('/cases/:id', {
    schema: {
      tags: ['Casos'],
      summary: 'Obter prontuário completo do caso',
      params: z.object({ id: z.string().uuid() }),
    }
  }, async (request, reply) => {
    const { id } = request.params
    
    const caso = await prisma.case.findUnique({
      where: { id },
      include: {
        criadoPor: { select: { nome: true } },
        agenteAcolhida: { select: { id: true, nome: true } },
        especialistaPAEFI: { select: { id: true, nome: true } },
        familia: true,
        encaminhamentos: { include: { autor: { select: { nome: true } } }, orderBy: { dataEnvio: 'desc' } },
        entregas: { include: { responsavel: { select: { nome: true } } }, orderBy: { dataSolicitacao: 'desc' } },
        evolucoes: { include: { autor: { select: { nome: true, cargo: true } } }, orderBy: { createdAt: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' }, take: 50, include: { autor: { select: { nome: true } } } },
      },
    })
    
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
    return reply.send(caso)
  })

  // 5. [PATCH] MUDAR STATUS
  server.patch('/cases/:id/status', {
    schema: {
      tags: ['Casos'],
      summary: 'Alterar status do fluxo (Workflow)',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ status: z.nativeEnum(CaseStatus) })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { status } = request.body
    const { sub: userId } = request.user as { sub: string }
    
    const caso = await prisma.case.findUnique({ where: { id } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    let updateData: any = { status }
    
    // Se estiver reativando um caso desligado, limpa os dados de desligamento
    if (caso.status === CaseStatus.DESLIGADO && status !== CaseStatus.DESLIGADO) {
      updateData = { 
        status: CaseStatus.AGUARDANDO_ACOLHIDA, 
        motivoDesligamento: null, 
        destinoDesligamento: null, 
        dataDesligamento: null, 
        parecerFinal: null 
      }
    }

    const updated = await prisma.case.update({ where: { id }, data: updateData })
    cache.invalidate('manager_stats')
    
    await createLog(id, userId, LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status)
    return reply.send(updated)
  })

  // 6. [PATCH] ATRIBUIR TÉCNICO
  server.patch('/cases/:id/assign', {
    schema: {
      tags: ['Casos'],
      summary: 'Atribuir caso a um especialista (Gerente)',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ specialistId: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { specialistId } = request.body
    const { cargo, sub: userId } = request.user as { sub: string, cargo: string }
    
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    
    const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } })
    const spec = await prisma.user.findUnique({ where: { id: specialistId } })
    
    const updated = await prisma.case.update({ 
      where: { id }, 
      data: { 
        especialistaPAEFIId: specialistId, 
        status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, 
        dataInicioPAEFI: new Date() 
      } 
    })
    
    cache.invalidate('manager_stats')
    const oldName = oldCase?.especialistaPAEFI?.nome || 'Nenhum'
    await createLog(id, userId, LogAction.ATRIBUICAO, `Atribuiu a ${spec?.nome || 'Desconhecido'}`, oldName, spec?.nome)
    
    return reply.send(updated)
  })

  // 7. [PATCH] DESLIGAR CASO
  server.patch('/cases/:id/close', {
    schema: {
      tags: ['Casos'],
      summary: 'Encerrar/Desligar um caso',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ 
        parecerFinal: z.string().min(10), 
        motivoDesligamento: z.string().min(1),
        destinoDesligamento: z.string().optional() 
      })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { parecerFinal, motivoDesligamento, destinoDesligamento } = request.body
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }
    
    const caso = await prisma.case.findUnique({ where: { id } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
    
    // Validação de permissão
    const isManager = cargo === Cargo.Gerente
    if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) {
      return reply.status(403).send({ message: 'Sem permissão para desligar este caso.' })
    }
    
    const updated = await prisma.case.update({ 
      where: { id }, 
      data: { 
        status: CaseStatus.DESLIGADO, 
        parecerFinal, 
        motivoDesligamento, 
        destinoDesligamento,
        dataDesligamento: new Date() 
      } 
    })
    
    cache.invalidate('manager_stats')
    await createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`)
    return reply.send(updated)
  })

  // 8. [GET] EXPORTAR CSV
  server.get('/cases/export', {
    schema: {
      tags: ['Casos'],
      summary: 'Exportar todos os dados para CSV (Gerente)'
    }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    // Busca otimizada para CSV (select explicito)
    const casos = await prisma.case.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } 
    })

    reply.header('Content-Disposition', `attachment; filename="export_casos_${format(new Date(), 'yyyy-MM-dd')}.csv"`)
    reply.type('text/csv; charset=utf-8')

    const csvStream = formatCsv({ headers: true })
    csvStream.pipe(reply.raw)

    casos.forEach((c) => {
      csvStream.write({ 
        ID: c.id, 
        Nome: c.nomeCompleto, 
        CPF: c.cpf, 
        Nascimento: formatDateForCsv(c.nascimento), 
        Sexo: c.sexo, 
        Telefone: c.telefone, 
        Endereco: c.endereco, 
        Entrada: formatDateForCsv(c.dataEntrada), 
        Urgencia: c.urgencia, 
        Violacao: c.violacao, 
        Categoria: c.categoria, 
        Orgao: c.orgaoDemandante, 
        Status: c.status, 
        Agente: c.agenteAcolhida?.nome ?? 'N/A', 
        Especialista: c.especialistaPAEFI?.nome ?? 'N/A', 
        Data_Desligamento: formatDateForCsv(c.dataDesligamento), 
        Motivo_Desligamento: c.motivoDesligamento, 
        Destino_Desligamento: c.destinoDesligamento, 
        Parecer_Final: c.parecerFinal ?? 'N/A', 
        Origem: c.origem 
      })
    })
    
    csvStream.end()
  })
}