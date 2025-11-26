// backend/src/routes/cases.ts
import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { format as formatCsv } from 'fast-csv'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseStatus, Cargo, LogAction, Sexo, Urgencia, Violacao, CategoriaPublico } from '@prisma/client'

// -------------------------------------------------------
// 🔧 UTILITÁRIOS
// -------------------------------------------------------

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
  return reply.status(500).send({ message })
}

function buildActiveCaseWhereClause(user: { cargo: string; sub: string }) {
  switch (user.cargo) {
    case Cargo.Agente_Social:
      return {
        agenteAcolhidaId: user.sub,
        status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }
      }
    case Cargo.Especialista:
      return {
        especialistaPAEFIId: user.sub,
        status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI
      }
    case Cargo.Gerente:
      return { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI }
    default:
      return { id: '-1' }
  }
}

function buildClosedCaseWhereClause(user: { cargo: string; sub: string }) {
  const where: any = { status: CaseStatus.DESLIGADO }
  if (user.cargo === Cargo.Agente_Social) where.agenteAcolhidaId = user.sub
  if (user.cargo === Cargo.Especialista) where.especialistaPAEFIId = user.sub
  return where
}

async function createLog(casoId: string, autorId: string, acao: LogAction, descricao: string) {
  await prisma.caseLog.create({
    data: { casoId, autorId, acao, descricao },
  })
}

// -------------------------------------------------------
// 🚀 ROTAS
// -------------------------------------------------------

export async function caseRoutes(app: FastifyInstance) {

  // 1. Criar Caso
  app.post('/cases', { onRequest: [app.authenticate] }, async (request, reply) => {
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
      agenteAcolhidaId: z.string().uuid(),
      // [CORREÇÃO] Aceita null (nullable) explicitamente
      numeroSei: z.string().nullable().optional(),
      // Link: Aceita URL válida, string vazia OU null
      linkSei: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
      observacoes: z.string().nullable().optional(),
      beneficios: z.array(z.string()).optional(),
    })

    try {
      const data = schema.parse(request.body)
      const userId = request.user.sub
      const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

      const novoCaso = await prisma.case.create({
        data: {
          ...data,
          pesoUrgencia,
          // Garante que undefined vire null no banco
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null, // Se for string vazia, vira null
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || [],
        },
      })

      await createLog(novoCaso.id, userId, LogAction.CRIACAO, 'Caso cadastrado no sistema.')

      return reply.status(201).send(novoCaso)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Log para ajudar a debugar qual campo falhou
        console.log('Erro validação POST:', error.flatten())
        return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten().fieldErrors })
      }
      return internalError(reply, 'Erro interno ao criar caso.', error)
    }
  })

  // 1.1 Editar Caso (PUT)
  app.put('/cases/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    
    // Schema robusto que aceita null nos campos opcionais
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
      agenteAcolhidaId: z.string().uuid(),
      // [CORREÇÃO] .nullable() adicionado para aceitar null vindo do front
      numeroSei: z.string().nullable().optional(),
      // Link: Aceita URL, string vazia ou null
      linkSei: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
      observacoes: z.string().nullable().optional(),
      beneficios: z.array(z.string()).optional(),
    })

    try {
      const { id } = paramsSchema.parse(request.params)
      const data = bodySchema.parse(request.body)
      const userId = request.user.sub

      const pesoUrgencia = calculateUrgencyWeight(data.urgencia)

      const updatedCaso = await prisma.case.update({
        where: { id },
        data: {
          ...data,
          pesoUrgencia,
          numeroSei: data.numeroSei ?? null,
          linkSei: data.linkSei || null, // String vazia vira null
          observacoes: data.observacoes ?? null,
          beneficios: data.beneficios || [],
        },
      })

      await createLog(id, userId, LogAction.OUTRO, 'Editou dados cadastrais do caso.')

      return reply.send(updatedCaso)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Erro validação PUT:', error.flatten())
        return reply.status(400).send({ message: 'Dados inválidos na edição.', errors: error.flatten().fieldErrors })
      }
      return internalError(reply, 'Erro ao editar caso.', error)
    }
  })

  // 2. Listar Casos Ativos
  app.get('/cases', { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(10),
      status: z.nativeEnum(CaseStatus).optional(),
      urgencia: z.string().optional(),
      violacao: z.string().optional(),
    })

    try {
      const { search, page, pageSize, status, urgencia, violacao } = schema.parse(request.query)
      let where = buildActiveCaseWhereClause(request.user) as any

      if (search) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { nomeCompleto: { contains: search, mode: 'insensitive' } },
              { cpf: { contains: search } },
            ],
          },
        ]
      }

      if (status) where.status = status
      if (urgencia && urgencia !== 'all') where.urgencia = urgencia
      if (violacao && violacao !== 'all') where.violacao = { equals: violacao }

      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          orderBy: [
            { pesoUrgencia: 'desc' },
            { createdAt: 'desc' }
          ],
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } },
          },
        }),
        prisma.case.count({ where }),
      ])

      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (error) {
      return internalError(reply, 'Erro interno ao listar casos ativos.', error)
    }
  })

  // 3. Listar Casos Fechados
  app.get('/cases/closed', { onRequest: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({
      search: z.string().optional(),
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(100).default(10),
    })

    try {
      const { search, page, pageSize } = schema.parse(request.query)
      let where = buildClosedCaseWhereClause(request.user)

      if (search) {
        where.OR = [
          { nomeCompleto: { contains: search, mode: 'insensitive' } },
          { cpf: { contains: search } },
        ]
      }

      const [items, total] = await Promise.all([
        prisma.case.findMany({
          where,
          orderBy: { dataDesligamento: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
          select: {
            id: true, nomeCompleto: true, cpf: true, status: true,
            dataDesligamento: true, parecerFinal: true, urgencia: true,
            motivoDesligamento: true,
            agenteAcolhida: { select: { nome: true } },
            especialistaPAEFI: { select: { nome: true } },
          },
        }),
        prisma.case.count({ where }),
      ])

      return reply.send({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
    } catch (error) {
      return internalError(reply, 'Erro interno ao listar casos finalizados.', error)
    }
  })

  // 4. Detalhes
  app.get('/cases/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
      const caso = await prisma.case.findUnique({
        where: { id },
        include: {
          criadoPor: { select: { nome: true } },
          agenteAcolhida: { select: { id: true, nome: true } },
          especialistaPAEFI: { select: { id: true, nome: true } },
          logs: { orderBy: { createdAt: 'desc' }, take: 20, include: { autor: { select: { nome: true } } } },
        },
      })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
      return reply.send(caso)
    } catch (error) {
      return internalError(reply, 'Erro ao buscar detalhes.', error)
    }
  })

  // 5. Status
  app.patch('/cases/:id/status', { onRequest: [app.authenticate] }, async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({ status: z.nativeEnum(CaseStatus) })
    try {
      const { id } = paramsSchema.parse(request.params)
      const { status } = bodySchema.parse(request.body)
      const { sub: userId, cargo } = request.user as { sub: string, cargo: string }
      const caso = await prisma.case.findUnique({ where: { id } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

      // Permissão aberta para reabertura e mudança de status (registrado em log)
      let updateData: any = { status }
      if (caso.status === CaseStatus.DESLIGADO && status !== CaseStatus.DESLIGADO) {
        updateData = { status: CaseStatus.AGUARDANDO_ACOLHIDA, motivoDesligamento: null, dataDesligamento: null, parecerFinal: null }
      }

      const updated = await prisma.case.update({ where: { id }, data: updateData })

      if (caso.status !== status) await createLog(id, userId, LogAction.MUDANCA_STATUS, `Alterou status para ${status}`)
      else await createLog(id, userId, LogAction.MUDANCA_STATUS, `Reabriu caso.`)
      
      return reply.send(updated)
    } catch (error) { return internalError(reply, 'Erro ao alterar status.', error) }
  })

  // 6. Assign
  app.patch('/cases/:id/assign', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() })
    const body = z.object({ specialistId: z.string().uuid() })
    try {
      const { id } = params.parse(request.params)
      const { specialistId } = body.parse(request.body)
      const { cargo, sub: userId } = request.user as { sub: string, cargo: string }
      if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
      const spec = await prisma.user.findUnique({ where: { id: specialistId } })
      const updated = await prisma.case.update({ where: { id }, data: { especialistaPAEFIId: specialistId, status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI, dataInicioPAEFI: new Date() } })
      await createLog(id, userId, LogAction.ATRIBUICAO, `Atribuiu a ${spec?.nome || 'Desconhecido'}`)
      return reply.send(updated)
    } catch (error) { return internalError(reply, 'Erro ao atribuir.', error) }
  })

  // 7. Close
  app.patch('/cases/:id/close', { onRequest: [app.authenticate] }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() })
    const body = z.object({ parecerFinal: z.string().min(10), motivoDesligamento: z.string().min(1) })
    try {
      const { id } = params.parse(request.params)
      const { parecerFinal, motivoDesligamento } = body.parse(request.body)
      const { sub: userId, cargo } = request.user as { sub: string, cargo: string }
      const caso = await prisma.case.findUnique({ where: { id } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
      const isManager = cargo === Cargo.Gerente
      if (!isManager && caso.agenteAcolhidaId !== userId && caso.especialistaPAEFIId !== userId) return reply.status(403).send({ message: 'Sem permissão.' })
      const updated = await prisma.case.update({ where: { id }, data: { status: CaseStatus.DESLIGADO, parecerFinal, motivoDesligamento, dataDesligamento: new Date() } })
      await createLog(id, userId, LogAction.DESLIGAMENTO, `Desligou: ${motivoDesligamento}`)
      return reply.send(updated)
    } catch (error) { return internalError(reply, 'Erro ao desligar.', error) }
  })

  // 8. Export
  app.get('/cases/export', { onRequest: [app.authenticate] }, async (request, reply) => {
    if ((request.user as any).cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    try {
      const casos = await prisma.case.findMany({ orderBy: { createdAt: 'desc' }, include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } })
      reply.header('Content-Disposition', `attachment; filename="export_casos_${format(new Date(), 'yyyy-MM-dd')}.csv"`)
      reply.type('text/csv; charset=utf-8')
      const csv = formatCsv({ headers: true })
      csv.pipe(reply.raw)
      casos.forEach((c) => {
        csv.write({ ID: c.id, Nome: c.nomeCompleto, CPF: c.cpf, Nascimento: formatDateForCsv(c.nascimento), Sexo: c.sexo, Telefone: c.telefone, Endereco: c.endereco, Entrada: formatDateForCsv(c.dataEntrada), Urgencia: c.urgencia, Violacao: c.violacao, Categoria: c.categoria, Orgao: c.orgaoDemandante, Status: c.status, Agente: c.agenteAcolhida?.nome ?? 'N/A', Especialista: c.especialistaPAEFI?.nome ?? 'N/A', Data_Desligamento: formatDateForCsv(c.dataDesligamento), Parecer_Final: c.parecerFinal ?? 'N/A' })
      })
      csv.end()
    } catch (error) { return internalError(reply, 'Erro ao exportar.', error) }
  })
}