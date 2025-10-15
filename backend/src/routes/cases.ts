// backend/src/routes/cases.ts
import { type FastifyInstance, type FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { format as formatCsv } from 'fast-csv'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- Funções Auxiliares (Helpers) ---

/**
 * Formata uma data de forma segura para o CSV.
 */
const formatDateForCsv = (date: Date | null | undefined): string => {
  if (date && !isNaN(date.getTime())) {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }
  return 'N/A'
}

/**
 * Constrói a cláusula 'where' do Prisma com base no cargo do utilizador.
 * Garante que Gerentes veem tudo, e outros cargos veem apenas os seus casos.
 */
function buildCaseWhereClause(user: { cargo: string; sub: string }) {
  if (user.cargo === 'Agente Social') {
    return { agenteAcolhidaId: user.sub }
  }
  if (user.cargo === 'Especialista') {
    return { especialistaPAEFIId: user.sub }
  }
  return {} // Gerentes não têm restrições
}

/**
 * Envia uma resposta de erro interno padronizada.
 */
function internalError(reply: FastifyReply, message: string, error: unknown) {
  // No futuro, aqui pode ser adicionado um sistema de log de erros mais robusto.
  console.error(message, error)
  return reply.status(500).send({ message })
}


export async function caseRoutes(app: FastifyInstance) {
  // Rota para criar um novo caso
  app.post(
    '/cases',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      // Validação de datas aprimorada com z.coerce.date()
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

  // Rota para listar casos (com paginação, busca e filtro)
  app.get(
    '/cases',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getCasesQuerySchema = z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
      })

      try {
        const { search, status, page, pageSize } = getCasesQuerySchema.parse(
          request.query,
        )

        // Lógica de permissão centralizada
        let whereClause = buildCaseWhereClause(request.user) as any

        if (status) {
          whereClause.status = status
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
        return internalError(reply, 'Erro interno ao listar casos.', error)
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
          `attachment; filename="export_casos_${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        )
        reply.type('text/csv; charset=utf-8')
        
        const csvStream = format({ headers: true })
        csvStream.pipe(reply.raw) // Uso correto do stream

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

