// backend/src/routes/cases.ts
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { format as formatCsv } from 'fast-csv'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseStatus, Cargo, LogAction, CaseOrigin } from '@prisma/client'
// Se der erro nesta importação, crie o arquivo lib/cache.ts (código no final da resposta)
import { cache } from '../lib/cache'

// --- TIPAGEM ---
// Define o formato do usuário no Request (injetado pelo JWT)
interface UserPayload {
  sub: string
  nome: string
  cargo: Cargo // Usa o Enum do Prisma
  iat?: number
  exp?: number
}

// Extende o Request do Fastify para incluir o usuário
type RequestWithUser = FastifyRequest & {
  user: UserPayload
}

// --- FUNÇÕES AUXILIARES ---

const stripTime = (date: Date | string): Date => {
  const d = new Date(date)
  // Garante datas UTC meio-dia para evitar problemas de fuso (-3h)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

const calculateUrgencyWeight = (urgencia: string): number => {
  const term = urgencia.trim()
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2;
  return 1;
}

const formatDateForCsv = (date: Date | null | undefined): string => {
  return date && !isNaN(date.getTime())
    ? format(date, 'dd/MM/yyyy', { locale: ptBR })
    : 'N/A'
}

function internalError(reply: FastifyReply, message: string, error: unknown) {
  console.error(message, error)
  return reply.status(500).send({ message, details: error instanceof Error ? error.message : String(error) })
}

function detectChanges(oldData: any, newData: any) {
  const changes: Record<string, { from: any, to: any }> = {}
  const ignoreFields = ['updatedAt', 'createdAt', 'pesoUrgencia', 'numeroSei', 'linkSei', 'observacoes', 'beneficios', 'criadoPorId', 'id'] 

  for (const key in newData) {
    if (ignoreFields.includes(key)) continue;
    let val1 = oldData[key]; let val2 = newData[key];
    
    // Comparação de datas simplificada
    if ((val1 instanceof Date || typeof val1 === 'string') && (val2 instanceof Date || typeof val2 === 'string')) {
      const d1 = new Date(val1); const d2 = new Date(val2);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const s1 = d1.toISOString().split('T')[0]; const s2 = d2.toISOString().split('T')[0];
        if (s1 === s2) continue;
      }
    }
    
    if (val1 !== val2) { 
        if (!val1 && !val2) continue; 
        changes[key] = { from: val1, to: val2 } 
    }
  }
  return changes
}

async function createLog(casoId: string, autorId: string, acao: LogAction, descricao: string, valorAnterior?: string | null, valorNovo?: string | null) {
  try {
     await prisma.caseLog.create({ 
         data: { casoId, autorId, acao, descricao, valorAnterior: valorAnterior ? String(valorAnterior) : null, valorNovo: valorNovo ? String(valorNovo) : null } 
     })
  } catch (err) {
     console.error("Falha ao criar log:", err)
  }
}

// Lógica de Filtro por Cargo (Regra de Ouro do SUAS)
function buildActiveCaseWhereClause(user: UserPayload) {
  switch (user.cargo) {
    case Cargo.Agente_Social:
      // Agente vê casos que estão aguardando ou em acolhida COM ELE
      return {
        OR: [
             { agenteAcolhidaId: user.sub },
             { status: CaseStatus.AGUARDANDO_ACOLHIDA } // Opcional: ver fila geral
        ],
        status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
      }
    case Cargo.Especialista:
      // Especialista vê casos PAEFI atribuídos a ele
      return {
        especialistaPAEFIId: user.sub,
        status: { 
          in: [
            CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, 
            CaseStatus.EM_ACOMPANHAMENTO_PAEFI, 
            CaseStatus.EM_MONITORAMENTO
          ] 
        }
      }
    case Cargo.Gerente:
      // Gerente vê tudo que não está desligado ou arquivado
      return { status: { not: CaseStatus.DESLIGADO } }
    default:
      return { id: '-1' } // Segurança: não retorna nada
  }
}

// --- ROTAS ---

export async function caseRoutes(app: FastifyInstance) {

  // Middleware local
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { await reply.send(err) }
  })

  // 1. Criar Caso
  app.post('/cases', async (request, reply) => {
    const req = request as RequestWithUser;
    const schema = z.object({
      nomeCompleto: z.string(),
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
      agenteAcolhidaId: z.string().uuid().optional().nullable(), // Opcional na criação
      numeroSei: z.string().nullable().optional(),
      linkSei: z.string().url().nullable().optional().or(z.literal('')),
      observacoes: z.string().nullable().optional(),
    })

    try {
      const data = schema.parse(req.body)
      const userId = req.user.sub
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

      const novoCaso = await prisma.case.create({
        data: {
          ...data,
          agenteAcolhidaId: data.agenteAcolhidaId || undefined, // Se não vier, fica null
          nascimento: stripTime(data.nascimento),
          dataEntrada: stripTime(data.dataEntrada),
          pesoUrgencia,
          criadoPorId: userId,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null, 
          observacoes: data.observacoes ?? null,
          beneficios: [],
        },
      })

      cache.invalidate('manager_stats')
      await createLog(novoCaso.id, userId, LogAction.CRIACAO, `Caso criado via ${data.origem}`)

      return reply.status(201).send(novoCaso)
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten().fieldErrors })
      return internalError(reply, 'Erro interno ao criar caso.', error)
    }
  })

  // 1.1 Editar Caso
  app.put('/cases/:id', async (request, reply) => {
    const req = request as RequestWithUser;
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      nomeCompleto: z.string(),
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
      origem: z.nativeEnum(CaseOrigin).optional(),
      agenteAcolhidaId: z.string().uuid().optional().nullable(),
      numeroSei: z.string().nullable().optional(),
      linkSei: z.string().url().nullable().optional().or(z.literal('')),
      observacoes: z.string().nullable().optional(),
    })

    try {
      const { id } = paramsSchema.parse(req.params)
      const rawData = bodySchema.parse(req.body)
      const userId = req.user.sub
      const data = { 
          ...rawData, 
          nascimento: stripTime(rawData.nascimento), 
          dataEntrada: stripTime(rawData.dataEntrada) 
      }

      const oldCase = await prisma.case.findUnique({ where: { id }, include: { agenteAcolhida: { select: { nome: true } } } })
      if (!oldCase) return reply.status(404).send({ message: 'Caso não encontrado.' })

      const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          agenteAcolhidaId: data.agenteAcolhidaId || null,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null,
          observacoes: data.observacoes ?? null,
        },
      })

      cache.invalidate('manager_stats')
      const changes = detectChanges(oldCase, data)
      const keys = Object.keys(changes)
      if (keys.length > 0) await createLog(id, userId, LogAction.OUTRO, `Editou ${keys.length} campos.`, JSON.stringify(changes), null)

      return reply.send(updatedCaso)
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten().fieldErrors })
      return internalError(reply, 'Erro ao editar caso.', error)
    }
  })

  // 2. Listar Casos (Com Paginação e Filtros)
  app.get('/cases', async (request, reply) => {
    const req = request as RequestWithUser;
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(10),
      status: z.nativeEnum(CaseStatus).optional(),
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

    try {
      const { search, page, pageSize, status, urgencia, violacao, categoria, sexo, view, sortBy, sortOrder, agenteId, specialistId } = schema.parse(req.query)
      let where: any = {}

      // Lógica de Filtro Prioritária
      if (agenteId) {
        where = { agenteAcolhidaId: agenteId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
      } else if (specialistId) {
        where = { especialistaPAEFIId: specialistId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] } }
      } else if (view === 'all') {
         // Permite ver todos, mas exclui desligados
        where = { status: { not: CaseStatus.DESLIGADO } }
      } else {
        // Usa a lógica padrão do cargo
        where = buildActiveCaseWhereClause(req.user)
      }

      // Filtros Adicionais
      if (search) where.AND = [...(where.AND || []), { OR: [{ nomeCompleto: { contains: search, mode: 'insensitive' } }, { cpf: { contains: search } }] }]
      if (status) where.status = status 
      if (urgencia && urgencia !== 'all') where.urgencia = urgencia
      if (violacao && violacao !== 'all') where.violacao = { equals: violacao }
      if (categoria && categoria !== 'all') where.categoria = { equals: categoria }
      if (sexo && sexo !== 'all') where.sexo = { equals: sexo }
      
      let orderBy: any = [{ pesoUrgencia: 'desc' }, { dataEntrada: 'asc' }]; 
      if (sortBy) {
        if (sortBy === 'urgencia') {
          orderBy = { pesoUrgencia: sortOrder || 'desc' };
        } else {
          orderBy = { [sortBy]: sortOrder || 'asc' };
        }
      }

      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where, orderBy, take: pageSize, skip: (page - 1) * pageSize,
          include: { agenteAcolhida: { select: { nome: true } }, especialistaPAEFI: { select: { nome: true } } },
        }),
        prisma.case.count({ where }),
      ])

      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (error) { return internalError(reply, 'Erro interno ao listar casos.', error) }
  })

  // 3. Listar Casos Fechados
  app.get('/cases/closed', async (request, reply) => {
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(10),
    })

    try {
      const { search, page, pageSize } = schema.parse(request.query)
      const where: any = { status: CaseStatus.DESLIGADO }
      if (search) where.OR = [{ nomeCompleto: { contains: search, mode: 'insensitive' } }, { cpf: { contains: search } }]

      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where, orderBy: { dataDesligamento: 'desc' }, take: pageSize, skip: (page - 1) * pageSize,
          select: {
            id: true, nomeCompleto: true, cpf: true, status: true,
            dataDesligamento: true, parecerFinal: true, urgencia: true,
            motivoDesligamento: true, destinoDesligamento: true,
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } },
          },
        }),
        prisma.case.count({ where }),
      ])

      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (error) { return internalError(reply, 'Erro ao listar casos finalizados.', error) }
  })

  // 4. Detalhes do Caso
  app.get('/cases/:id', async (request, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
      
      const caso = await prisma.case.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true } },
          agenteAcolhida: { select: { id: true, nome: true } },
          especialistaPAEFI: { select: { id: true, nome: true } },
          
          familia: true,           
          
          encaminhamentos: {
            include: { autor: { select: { nome: true } } },
            orderBy: { dataEnvio: 'desc' }
          },
          
          entregas: {              
            orderBy: { dataSolicitacao: 'desc' }
          },
          
          evolucoes: {
            include: { autor: { select: { nome: true } } },
            orderBy: { createdAt: 'desc' }
          },
          
          logs: {
            orderBy: { createdAt: 'desc' }, 
            take: 50, 
            include: { autor: { select: { nome: true } } } 
          },
        },
      })
      
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
      return reply.send(caso)
    } catch (error) { return internalError(reply, 'Erro ao buscar detalhes.', error) }
  })

  // 5. Mudar Status
  app.patch('/cases/:id/status', async (request, reply) => {
    const req = request as RequestWithUser;
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({ status: z.nativeEnum(CaseStatus) })
    try {
      const { id } = paramsSchema.parse(req.params)
      const { status } = bodySchema.parse(req.body)
      const { sub: userId } = req.user
      
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
    } catch (error) { return internalError(reply, 'Erro ao alterar status.', error) }
  })

  // 6. Atribuir Especialista (Apenas Gerente)
  app.patch('/cases/:id/assign', async (request, reply) => {
    const req = request as RequestWithUser;
    const params = z.object({ id: z.string().uuid() })
    const body = z.object({ specialistId: z.string().uuid() })
    try {
      const { id } = params.parse(req.params)
      const { specialistId } = body.parse(req.body)
      const { cargo, sub: userId } = req.user
      
      // Permite atribuição por Gerente 
      if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado. Apenas gerentes atribuem PAEFI.' })
      
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
      await createLog(id, userId, LogAction.ATRIBUICAO, `Atribuiu a ${spec?.nome || 'Desconhecido'} (Acolhida Esp.)`, oldName, spec?.nome)
      return reply.send(updated)
    } catch (error) { return internalError(reply, 'Erro ao atribuir.', error) }
  })

  // 7. Desligar Caso
  app.patch('/cases/:id/close', async (request, reply) => {
    const req = request as RequestWithUser;
    const params = z.object({ id: z.string().uuid() })
    const body = z.object({ 
      parecerFinal: z.string().min(10), 
      motivoDesligamento: z.string().min(1),
      destinoDesligamento: z.string().optional() 
    })
    try {
      const { id } = params.parse(req.params)
      const { parecerFinal, motivoDesligamento, destinoDesligamento } = body.parse(req.body)
      const { sub: userId, cargo } = req.user
      
      const caso = await prisma.case.findUnique({ where: { id } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
      
      const isManager = cargo === Cargo.Gerente
      // Apenas o Gerente ou o Técnico Responsável podem desligar
      if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: 'Sem permissão.' })
      
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
      await createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}. Destino: ${destinoDesligamento || 'Não informado'}`)
      return reply.send(updated)
    } catch (error) { return internalError(reply, 'Erro ao desligar.', error) }
  })

  // 8. Exportar CSV (Gerente)
  app.get('/cases/export', async (request, reply) => {
    const req = request as RequestWithUser;
    if (req.user.cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    try {
      const casos = await prisma.case.findMany({ orderBy: { createdAt: 'desc' }, include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } })
      reply.header('Content-Disposition', `attachment; filename="export_casos_${format(new Date(), 'yyyy-MM-dd')}.csv"`)
      reply.type('text/csv; charset=utf-8')
      const csv = formatCsv({ headers: true })
      csv.pipe(reply.raw)
      casos.forEach((c) => {
        csv.write({ 
          ID: c.id, Nome: c.nomeCompleto, CPF: c.cpf, Nascimento: formatDateForCsv(c.nascimento), Sexo: c.sexo, 
          Telefone: c.telefone, Endereco: c.endereco, Entrada: formatDateForCsv(c.dataEntrada), Urgencia: c.urgencia, 
          Violacao: c.violacao, Categoria: c.categoria, Orgao: c.orgaoDemandante, Status: c.status, 
          Agente: c.agenteAcolhida?.nome ?? 'N/A', Especialista: c.especialistaPAEFI?.nome ?? 'N/A', 
          Data_Desligamento: formatDateForCsv(c.dataDesligamento), Motivo_Desligamento: c.motivoDesligamento, 
          Destino_Desligamento: c.destinoDesligamento, Parecer_Final: c.parecerFinal ?? 'N/A', Origem: c.origem 
        })
      })
      csv.end()
    } catch (error) { return internalError(reply, 'Erro ao exportar.', error) }
  })
}