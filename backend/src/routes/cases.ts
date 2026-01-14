import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseStatus, Cargo, LogAction } from '@prisma/client'
import { createCaseBodySchema, updateCaseBodySchema } from '../schemas/caseSchema'
import { geocodeAddress } from '../utils/geocoding' 
import ExcelJS from 'exceljs' // Certifique-se de ter instalado: npm i exceljs

// --- FUNÇÕES AUXILIARES ---

const stripTime = (date: Date | string): Date => {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
}

const calculateUrgencyWeight = (urgencia: string): number => {
  const term = urgencia.trim()
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte', 'Violência sexual'].includes(term)) return 4
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente', 'Violência física'].includes(term)) return 3
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante', 'Situação de rua'].includes(term)) return 2
  return 1
}

const formatDateForExport = (date: Date | null | undefined): string => {
  return date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-'
}

const formatContactsForExport = (contatos: any): string => {
  if (!contatos || !Array.isArray(contatos)) return '-'
  return contatos.map((c: any) => `${c.numero} (${c.tipo})`).join('; ')
}

const formatAddressForExport = (c: any): string => {
  const parts = [
    c.endereco_logradouro,
    c.endereco_complemento,
    c.endereco_bairro,
    c.endereco_ra && c.endereco_ra !== 'Não Informada' ? `RA: ${c.endereco_ra}` : null,
    c.endereco_cidade !== 'Brasília' ? c.endereco_cidade : null
  ]
  return parts.filter(Boolean).join(', ')
}

async function createLog(casoId: string, autorId: string, acao: LogAction, descricao: string, valorAnterior?: string | null, valorNovo?: string | null) {
  prisma.caseLog.create({ 
    data: { 
      casoId, 
      autorId, 
      acao, 
      descricao, 
      valorAnterior: valorAnterior ? String(valorAnterior) : null, 
      valorNovo: valorNovo ? String(valorNovo) : null 
    } 
  }).catch(err => console.error('Falha ao criar log:', err))
}

function buildActiveCaseWhereClause(user: { cargo: string; sub: string }) {
  const cargo = user.cargo
  if (cargo === Cargo.Gerente) return { status: CaseStatus.AGUARDANDO_DISTRIBUICAO }
  if (cargo === Cargo.Agente_Social) return { agenteAcolhidaId: user.sub, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
  if (cargo === Cargo.Especialista) return { especialistaPAEFIId: user.sub, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }
  return {} 
}

// --- ROTAS ---

export async function caseRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { await reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [POST] CRIAR CASO
  server.post('/cases', {
    schema: { tags: ['Casos'], body: createCaseBodySchema }
  }, async (request, reply) => {
    const data = request.body
    const userId = request.user.sub
    const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

    const exists = await prisma.case.findUnique({ where: { cpf: data.cpf } })
    if (exists) return reply.status(409).send({ message: 'CPF já cadastrado.' })

    let endLat = data.endereco.latitude || null
    let endLng = data.endereco.longitude || null

    if (!endLat && data.endereco.logradouro && data.endereco.ra) {
      try {
        const coords = await geocodeAddress(data.endereco.logradouro, data.endereco.ra, data.endereco.cidade)
        if (coords) { endLat = coords.lat; endLng = coords.lng }
      } catch (e) {}
    }

    const newCase = await prisma.case.create({
      data: {
        nomeCompleto: data.nomeCompleto,
        nomeSocial: data.nomeSocial,
        cpf: data.cpf,
        nascimento: stripTime(data.nascimento),
        sexo: data.sexo,
        contatos: data.contatos as any,
        endereco_logradouro: data.endereco.logradouro,
        endereco_ra: data.endereco.ra,
        endereco_cep: data.endereco.cep,
        endereco_complemento: data.endereco.complemento,
        endereco_bairro: data.endereco.bairro,
        endereco_cidade: data.endereco.cidade,
        endereco_uf: data.endereco.uf,
        latitude: endLat,
        longitude: endLng,
        responsavelLegal: data.responsavelLegal,
        parentescoResponsavel: data.parentescoResponsavel,
        dataEntrada: stripTime(data.dataEntrada || new Date()),
        urgencia: data.urgencia,
        pesoUrgencia,
        violacao: data.violacao,
        categoria: data.categoria,
        orgaoDemandante: data.orgaoDemandante,
        origem: data.origem,
        agenteAcolhidaId: data.agenteAcolhidaId || null,
        criadoPorId: userId,
        numeroSei: data.numeroSei || null,
        linkSei: data.linkSei || null,
        observacoes: data.observacoes || null,
        beneficios: data.beneficios || [],
        status: CaseStatus.AGUARDANDO_ACOLHIDA
      }
    })

    cache.invalidate('manager_stats')
    await createLog(newCase.id, userId, LogAction.CRIACAO, `Caso criado via ${data.origem}`)
    return reply.status(201).send(newCase)
  })

  // 1.1 [PUT] EDITAR CASO
  server.put('/cases/:id', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }), body: updateCaseBodySchema }
  }, async (request, reply) => {
    const { id } = request.params
    const rawData = request.body
    const userId = request.user.sub

    const oldCase = await prisma.case.findUnique({ where: { id } })
    if (!oldCase) return reply.status(404).send({ message: 'Caso não encontrado.' })

    const dataToUpdate: any = { ...rawData }
    
    if (rawData.nascimento) dataToUpdate.nascimento = stripTime(rawData.nascimento)
    if (rawData.dataEntrada) dataToUpdate.dataEntrada = stripTime(rawData.dataEntrada)
    if (rawData.urgencia) dataToUpdate.pesoUrgencia = calculateUrgencyWeight(rawData.urgencia)

    if (rawData.endereco) {
      dataToUpdate.endereco_logradouro = rawData.endereco.logradouro
      dataToUpdate.endereco_ra = rawData.endereco.ra
      dataToUpdate.endereco_cep = rawData.endereco.cep
      dataToUpdate.endereco_complemento = rawData.endereco.complemento
      dataToUpdate.endereco_bairro = rawData.endereco.bairro
      dataToUpdate.endereco_cidade = rawData.endereco.cidade
      dataToUpdate.endereco_uf = rawData.endereco.uf
      dataToUpdate.latitude = rawData.endereco.latitude
      dataToUpdate.longitude = rawData.endereco.longitude
      
      const addressChanged = rawData.endereco.logradouro !== oldCase.endereco_logradouro || rawData.endereco.ra !== oldCase.endereco_ra
      if (addressChanged && !rawData.endereco.latitude) {
        try {
            const coords = await geocodeAddress(rawData.endereco.logradouro, rawData.endereco.ra, rawData.endereco.cidade)
            if (coords) { dataToUpdate.latitude = coords.lat; dataToUpdate.longitude = coords.lng }
        } catch (e) {}
      }
      delete dataToUpdate.endereco
    }

    const updatedCaso = await prisma.case.update({ where: { id }, data: dataToUpdate })
    cache.invalidate('manager_stats')
    await createLog(id, userId, LogAction.OUTRO, `Editou dados cadastrais.`)
    return reply.send(updatedCaso)
  })

  // 2. [GET] LISTAR CASOS
  server.get('/cases', {
    schema: {
      tags: ['Casos'],
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
        status: z.string().optional(), 
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
    const { search, page, pageSize, status, urgencia, violacao, categoria, sexo, view, sortBy, sortOrder, agenteId, specialistId } = request.query
    let where: any = {}

    if (agenteId) where = { agenteAcolhidaId: agenteId, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
    else if (specialistId) where = { especialistaPAEFIId: specialistId, status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } }
    else if (view === 'all') {
      if (status === 'DESLIGADO') where = { status: CaseStatus.DESLIGADO }
      else where = { status: { not: CaseStatus.DESLIGADO } }
    } else where = buildActiveCaseWhereClause(request.user as any)

    if (search) {
      where.AND = [ ...(where.AND || []), {
          OR: [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } },
            { endereco_logradouro: { contains: search, mode: 'insensitive' } },
            { endereco_ra: { contains: search, mode: 'insensitive' } }
          ]
      }]
    }

    if (status && status !== 'all') {
      const validStatuses = status.split(',').filter(s => Object.values(CaseStatus).includes(s as CaseStatus))
      if (validStatuses.length > 0) where.status = { in: validStatuses }
    }

    if (urgencia && urgencia !== 'all') where.urgencia = urgencia
    if (violacao && violacao !== 'all') where.violacao = { has: violacao }
    if (categoria && categoria !== 'all') where.categoria = categoria
    if (sexo && sexo !== 'all') where.sexo = sexo

    let orderBy: any = [{ pesoUrgencia: 'desc' }, { dataEntrada: 'asc' }]
    if (sortBy) {
      if (sortBy === 'urgencia') orderBy = { pesoUrgencia: sortOrder || 'desc' }
      else orderBy = { [sortBy]: sortOrder || 'asc' }
    }

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, orderBy, take: pageSize, skip: (page - 1) * pageSize,
        include: { agenteAcolhida: { select: { nome: true } }, especialistaPAEFI: { select: { nome: true } } },
      }),
      prisma.case.count({ where }),
    ])

    return reply.send({ data: items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  })

  // 3. [GET] LISTAR FECHADOS
  server.get('/cases/closed', {
    schema: {
      tags: ['Casos'],
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
        { cpf: { contains: search } }
      ]
    }
    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, orderBy: { dataDesligamento: 'desc' }, take: pageSize, skip: (page - 1) * pageSize,
        include: { agenteAcolhida: { select: { nome: true } }, especialistaPAEFI: { select: { nome: true } } },
      }),
      prisma.case.count({ where }),
    ])
    return reply.send({ data: items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } })
  })

  // 4. [GET] DETALHES COMPLETOS
  server.get('/cases/:id', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }) }
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
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }), body: z.object({ status: z.nativeEnum(CaseStatus) }) }
  }, async (request, reply) => {
    const { id } = request.params
    const { status } = request.body
    const { sub: userId } = request.user as { sub: string }
    
    const caso = await prisma.case.findUnique({ where: { id } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    let updateData: any = { status }
    if (caso.status === CaseStatus.DESLIGADO && status !== CaseStatus.DESLIGADO) {
      updateData = { status: CaseStatus.AGUARDANDO_ACOLHIDA, motivoDesligamento: null, destinoDesligamento: null, dataDesligamento: null, parecerFinal: null }
    }

    const updated = await prisma.case.update({ where: { id }, data: updateData })
    cache.invalidate('manager_stats')
    await createLog(id, userId, LogAction.MUDANCA_STATUS, `Alterou status para ${status}`, caso.status, status)
    return reply.send(updated)
  })

  // 6. [PATCH] ATRIBUIR TÉCNICO
  server.patch('/cases/:id/assign', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }), body: z.object({ specialistId: z.string().uuid() }) }
  }, async (request, reply) => {
    const { id } = request.params
    const { specialistId } = request.body
    const { cargo, sub: userId } = request.user as { sub: string, cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    
    const oldCase = await prisma.case.findUnique({ where: { id }, include: { especialistaPAEFI: true } })
    const spec = await prisma.user.findUnique({ where: { id: specialistId } })
    const updated = await prisma.case.update({ where: { id }, data: { especialistaPAEFIId: specialistId, status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, dataInicioPAEFI: new Date() } })
    
    cache.invalidate('manager_stats')
    await createLog(id, userId, LogAction.ATRIBUICAO, `Atribuiu a ${spec?.nome || 'Desconhecido'}`, oldCase?.especialistaPAEFI?.nome, spec?.nome)
    return reply.send(updated)
  })

  // 7. [PATCH] DESLIGAR CASO
  server.patch('/cases/:id/close', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }), body: z.object({ parecerFinal: z.string().min(10), motivoDesligamento: z.string().min(1), destinoDesligamento: z.string().optional() }) }
  }, async (request, reply) => {
    const { id } = request.params
    const { parecerFinal, motivoDesligamento, destinoDesligamento } = request.body
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }
    
    const caso = await prisma.case.findUnique({ where: { id } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
    const isManager = cargo === Cargo.Gerente
    if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: 'Sem permissão.' })
    
    const updated = await prisma.case.update({ where: { id }, data: { status: CaseStatus.DESLIGADO, parecerFinal, motivoDesligamento, destinoDesligamento, dataDesligamento: new Date() } })
    cache.invalidate('manager_stats')
    await createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`)
    return reply.send(updated)
  })

  // 8. [GET] EXPORTAR EXCEL (USANDO EXCELJS E RETORNANDO BUFFER)
  server.get('/cases/export', {
    schema: { tags: ['Casos'], summary: 'Exportar todos os dados para Excel (.xlsx)' }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    try {
      const casos = await prisma.case.findMany({ 
        orderBy: { createdAt: 'desc' }, 
        include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } 
      })

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Base Completa')

      // Configuração de Colunas com TODOS os campos
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Nome Completo', key: 'nome', width: 35 },
        { header: 'Nome Social', key: 'nome_social', width: 25 },
        { header: 'CPF', key: 'cpf', width: 15 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'Data Nascimento', key: 'nasc', width: 15 },
        { header: 'Sexo', key: 'sexo', width: 12 },
        { header: 'Categoria', key: 'cat', width: 20 },
        { header: 'Contatos', key: 'contatos', width: 30 },
        { header: 'Endereço', key: 'endereco', width: 40 },
        { header: 'CEP', key: 'cep', width: 10 },
        { header: 'RA', key: 'ra', width: 15 },
        { header: 'Lat', key: 'lat', width: 12 },
        { header: 'Long', key: 'lng', width: 12 },
        { header: 'Data Entrada', key: 'entrada', width: 15 },
        { header: 'Urgência', key: 'urgencia', width: 20 },
        { header: 'Peso', key: 'peso', width: 8 },
        { header: 'Violações', key: 'violacoes', width: 35 },
        { header: 'Benefícios', key: 'beneficios', width: 25 },
        { header: 'Orgão Demandante', key: 'orgao', width: 20 },
        { header: 'Nº SEI', key: 'sei', width: 20 },
        { header: 'Link SEI', key: 'link_sei', width: 30 },
        { header: 'Responsável Legal', key: 'resp', width: 30 },
        { header: 'Parentesco', key: 'parent', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Agente Acolhida', key: 'agente', width: 25 },
        { header: 'Especialista Ref.', key: 'spec', width: 25 },
        { header: 'Origem do Cadastro', key: 'origem', width: 15 },
      ]

      worksheet.getRow(1).font = { bold: true, size: 12 }
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }

      casos.forEach((c) => {
        worksheet.addRow({
            id: c.id.slice(0, 8),
            nome: c.nomeCompleto,
            nome_social: c.nomeSocial || '-',
            cpf: c.cpf || '-',
            nis: c.nis || '-',
            nasc: formatDateForExport(c.nascimento),
            sexo: c.sexo,
            cat: c.categoria,
            contatos: formatContactsForExport(c.contatos),
            endereco: formatAddressForExport(c),
            cep: c.endereco_cep || '-',
            ra: c.endereco_ra,
            lat: c.latitude,
            lng: c.longitude,
            entrada: formatDateForExport(c.dataEntrada),
            urgencia: c.urgencia,
            peso: c.pesoUrgencia,
            violacoes: Array.isArray(c.violacao) ? c.violacao.join('; ') : (c.violacao || ''),
            beneficios: Array.isArray(c.beneficios) ? c.beneficios.join('; ') : '',
            orgao: c.orgaoDemandante,
            sei: c.numeroSei || '-',
            link_sei: c.linkSei || '-',
            resp: c.responsavelLegal || '-',
            parent: c.parentescoResponsavel || '-',
            status: c.status.replace(/_/g, ' '),
            agente: c.agenteAcolhida?.nome || '-',
            spec: c.especialistaPAEFI?.nome || '-',
            origem: c.origem
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()

      // Header correto para Excel
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="Exportacao_Casos_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`)
      
      // Envia o buffer diretamente
      return reply.send(buffer)

    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar excel.' })
    }
  })
}