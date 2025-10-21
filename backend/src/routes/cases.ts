// backend/src/routes/cases.ts
import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { format as formatCsv } from 'fast-csv'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Funções Auxiliares (Helpers) ---

const formatDateForCsv = (date: Date | null | undefined): string => {
  if (date && !isNaN(date.getTime())) {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }
  return 'N/A'
}

function internalError(reply: FastifyReply, message: string, error: unknown) {
  console.error(message, error)
  return reply.status(500).send({ message })
}

function buildActiveCaseWhereClause(user: { cargo: string; sub: string }) {
  if (user.cargo === 'Agente Social') {
    return {
      agenteAcolhidaId: user.sub,
      status: { in: ['AGUARDANDO_ACOLHIDA', 'EM_ACOLHIDA'] },
    }
  }
  if (user.cargo === 'Especialista') {
    return {
      especialistaPAEFIId: user.sub,
      status: 'EM_ACOMPANHAMENTO_PAEFI',
    }
  }
  if (user.cargo === 'Gerente') {
    return {
      status: 'AGUARDANDO_DISTRIBUICAO_PAEFI',
    }
  }
  return { id: '-1' }
}

function buildClosedCaseWhereClause(user: { cargo: string; sub: string }) {
  const where: any = {
    status: 'DESLIGADO',
  }
  if (user.cargo === 'Agente Social') {
    where.agenteAcolhidaId = user.sub
  } else if (user.cargo === 'Especialista') {
    where.especialistaPAEFIId = user.sub
  }
  return where
}

export async function caseRoutes(app: FastifyInstance) {
  // Rota para criar um novo caso
  app.post(
    '/cases',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const createCaseBodySchema = z.object({
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
        numeroSei: z.string().optional(),
        linkSei: z.string().url().optional(),
        agenteAcolhidaId: z.string().uuid(),
        observacoes: z.string().optional(),
        beneficios: z.array(z.string()).optional(),
      })

      try {
        const dataToSave = createCaseBodySchema.parse(request.body)
        const userId = request.user.sub

        const newCase = await prisma.case.create({
          data: {
            ...dataToSave,
            criadoPorId: userId,
          },
        })

        return await reply.status(201).send(newCase)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return await reply.status(400).send({
            message: 'Dados inválidos.',
            errors: error.flatten().fieldErrors,
          })
        }
        return internalError(reply, 'Erro interno ao criar caso.', error)
      }
    },
  )

  // Rota para listar casos (Refatorada para "Casos Ativos / Minha Caixa")
  app.get(
    '/cases',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getCasesQuerySchema = z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
      })

      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query,
        )

        let whereClause = buildActiveCaseWhereClause(request.user) as any

        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } },
          ]
        }

        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: pageSize,
            skip: (page - 1) * pageSize,
            include: {
              agenteAcolhida: { select: { nome: true } },
              especialistaPAEFI: { select: { nome: true } },
            },
          }),
          prisma.case.count({ where: whereClause }),
        ])

        return await reply.status(200).send({
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        })
      } catch (error) {
        return internalError(reply, 'Erro interno ao listar casos ativos.', error)
      }
    },
  )

  // Nova Rota para listar Casos Finalizados
  app.get(
    '/cases/closed',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getCasesQuerySchema = z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
      })

      try {
        const { search, page, pageSize } = getCasesQuerySchema.parse(
          request.query,
        )

        let whereClause: any = {
          status: 'DESLIGADO',
        }

        if (search) {
          whereClause.OR = [
            { nomeCompleto: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } },
          ]
        }

        const [cases, total] = await Promise.all([
          prisma.case.findMany({
            where: whereClause,
            orderBy: { dataDesligamento: 'desc' },
            take: pageSize,
            skip: (page - 1) * pageSize,
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
              status: true,
              dataDesligamento: true,
              parecerFinal: true,
            },
          }),
          prisma.case.count({ where: whereClause }),
        ])

        return await reply.status(200).send({
          items: cases,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        })
      } catch (error) {
        return internalError(reply, 'Erro interno ao listar casos finalizados.', error)
      }
    },
  )
  
  // Rota para buscar um único caso por ID
  app.get(
    '/cases/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getCaseParamsSchema = z.object({
        id: z.string().uuid(),
      })

      try {
        const { id } = getCaseParamsSchema.parse(request.params)
        const caseDetail = await prisma.case.findUnique({
          where: { id },
          include: {
            criadoPor: { select: { nome: true } },
            agenteAcolhida: { select: { id: true, nome: true } },
            especialistaPAEFI: { select: { id: true, nome: true } },
          },
        })

        if (!caseDetail) {
          return await reply.status(404).send({ message: 'Caso não encontrado.' })
        }
        
        return await reply.status(200).send(caseDetail)
      } catch (error) {
        return internalError(reply, 'Erro interno ao buscar o caso.', error)
      }
    },
  )

  // Rota para atualizar o status de um caso
  app.patch(
    '/cases/:id/status',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z.object({
        status: z.enum([
          'AGUARDANDO_ACOLHIDA',
          'EM_ACOLHIDA',
          'AGUARDANDO_DISTRIBUICAO_PAEFI',
          'EM_ACOMPANHAMENTO_PAEFI',
          'DESLIGADO',
        ]),
      })

      try {
        const { id } = paramsSchema.parse(request.params)
        const { status } = bodySchema.parse(request.body)
        const { sub: userId, cargo } = request.user

        const caseToUpdate = await prisma.case.findUnique({ where: { id } })
        if (!caseToUpdate) {
          return await reply.status(404).send({ message: 'Caso não encontrado.' })
        }

        const isManager = cargo === 'Gerente'
        const isResponsibleAgent = caseToUpdate.agenteAcolhidaId === userId
        const isResponsibleSpecialist =
          caseToUpdate.especialistaPAEFIId === userId

        // Permissão para reabrir (só gerente pode)
        if (caseToUpdate.status === 'DESLIGADO' && status !== 'DESLIGADO') {
          if (!isManager) {
             return await reply.status(403).send({ message: 'Apenas Gerentes podem reabrir um caso.' })
          }
        } else if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
           return await reply.status(403).send({ message: 'Você não tem permissão para esta ação.' })
        }

        let data: any = { status }

        // Lógica de Reabertura: Se o caso estava desligado e foi reaberto,
        // limpa os campos de desligamento.
        if (caseToUpdate.status === 'DESLIGADO' && status !== 'DESLIGADO') {
          data = {
            ...data,
            status: 'AGUARDANDO_ACOLHIDA', // Sempre volta para a triagem inicial
            motivoDesligamento: null,
            dataDesligamento: null,
            parecerFinal: null,
          }
        }
        
        const updatedCase = await prisma.case.update({
          where: { id },
          data,
        })

        return await reply.status(200).send(updatedCase)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return await reply.status(400).send({
            message: 'Dados de status inválidos.',
            errors: error.flatten().fieldErrors,
          })
        }
        return internalError(reply, 'Erro interno ao atualizar o status.', error)
      }
    },
  )

  // Rota para atribuir um especialista a um caso
  app.patch(
    '/cases/:id/assign',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z.object({
        specialistId: z.string().uuid(),
      })

      try {
        const { id } = paramsSchema.parse(request.params)
        const { specialistId } = bodySchema.parse(request.body)
        const { cargo } = request.user

        if (cargo !== 'Gerente') {
          return await reply
            .status(403)
            .send({ message: 'Apenas gerentes podem atribuir casos.' })
        }

        const updatedCase = await prisma.case.update({
          where: { id },
          data: {
            especialistaPAEFIId: specialistId,
            status: 'EM_ACOMPANHAMENTO_PAEFI',
            dataInicioPAEFI: new Date(),
          },
        })

        return await reply.status(200).send(updatedCase)
      } catch (error) {
        return internalError(reply, 'Erro interno ao atribuir especialista.', error)
      }
    },
  )

  // Rota para desligar um caso com parecer final e motivo
  app.patch(
    '/cases/:id/close',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z.object({
        parecerFinal: z.string().min(10, 'O parecer final é muito curto.'),
        motivoDesligamento: z.string().min(1, 'O motivo de desligamento é obrigatório.'),
      })

      try {
        const { id } = paramsSchema.parse(request.params)
        const { parecerFinal, motivoDesligamento } = bodySchema.parse(request.body)
        const { sub: userId, cargo } = request.user

        const caseToClose = await prisma.case.findUnique({ where: { id } })
        if (!caseToClose) {
          return await reply.status(404).send({ message: 'Caso não encontrado.' })
        }

        // Permissão atualizada: Gerente, Agente responsável ou Especialista responsável
        const isManager = cargo === 'Gerente'
        const isResponsibleAgent = caseToClose.agenteAcolhidaId === userId
        const isResponsibleSpecialist = caseToClose.especialistaPAEFIId === userId

        if (!isManager && !isResponsibleAgent && !isResponsibleSpecialist) {
          return await reply.status(403).send({ message: 'Você não tem permissão para esta ação.' })
        }

        const updatedCase = await prisma.case.update({
          where: { id },
          data: {
            status: 'DESLIGADO',
            parecerFinal,
            motivoDesligamento,
            dataDesligamento: new Date(),
          },
        })

        return await reply.status(200).send(updatedCase)
      } catch (error) {
        return internalError(reply, 'Erro interno ao desligar o caso.', error)
      }
    },
  )

  // Rota para exportar todos os casos para CSV
  app.get(
    '/cases/export',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      if (request.user.cargo !== 'Gerente') {
        return await reply.status(403).send({ message: 'Acesso negado.' })
      }

      try {
        const allCases = await prisma.case.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            criadoPor: true,
            agenteAcolhida: true,
            especialistaPAEFI: true,
          },
        })

        reply.header(
          'Content-Disposition',
          `attachment; filename="export_casos_${format(
            new Date(),
            'yyyy-MM-dd',
          )}.csv"`,
        )
        reply.type('text/csv; charset=utf-8')
        
        const csvStream = format({ headers: true })
        csvStream.pipe(reply.raw)

        allCases.forEach((c) => {
          csvStream.write({
            ID: c.id,
            Nome_Completo: c.nomeCompleto,
            CPF: c.cpf,
            Nascimento: formatDateForCsv(c.nascimento),
            Sexo: c.sexo,
            Telefone: c.telefone,
            Endereco: c.endereco,
            Data_Entrada: formatDateForCsv(c.dataEntrada),
            Urgencia: c.urgencia,
            Violacao: c.violacao,
            Categoria: c.categoria,
            Orgao_Demandante: c.orgaoDemandante,
            Numero_SEI: c.numeroSei ?? 'N/A',
            Status: c.status,
            Criado_Por: c.criadoPor?.nome ?? 'Utilizador Removido',
            Agente_Acolhida: c.agenteAcolhida?.nome ?? 'Não Atribuído',
            Especialista_PAEFI: c.especialistaPAEFI?.nome ?? 'Não Atribuído',
            Data_Desligamento: formatDateForCsv(c.dataDesligamento),
            Parecer_Final: c.parecerFinal ?? 'N/A',
          })
        })

        csvStream.end()
      } catch (error) {
        return internalError(reply, 'Erro interno ao exportar dados.', error)
      }
    },
  )
}