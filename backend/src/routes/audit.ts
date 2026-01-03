// backend/src/routes/audit.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays, format as formatDate } from 'date-fns'
import { Cargo, LogAction } from '@prisma/client'
import { format as formatCsv } from 'fast-csv'

interface UserPayload {
  sub: string
  cargo: Cargo
}

export async function auditRoutes(app: FastifyInstance) {
  
  // 🔐 Middleware: Apenas Gerentes acessam a Auditoria
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as UserPayload

      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso restrito à gestão.' })
      }
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [GET] /audit — Visualização em Tela (Paginada)
  app.get('/audit', async (request, reply) => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      autorId: z.string().uuid().optional(),
      acao: z.nativeEnum(LogAction).optional().or(z.literal('all')), // Aceita Enum ou 'all'
      periodo: z.enum(['hoje', '7dias', '30dias', 'tudo']).default('7dias'),
      caseId: z.string().uuid().optional(),
      search: z.string().min(1).optional(),
    })

    try {
      const params = querySchema.parse(request.query)
      const { page, pageSize, autorId, acao, periodo, caseId, search } = params

      const where: any = {}

      // 🔍 Busca Textual Inteligente
      if (search) {
        where.OR = [
          { descricao: { contains: search, mode: 'insensitive' } },
          { autor: { nome: { contains: search, mode: 'insensitive' } } },
          // Busca no nome do caso apenas se o log tiver um caso vinculado
          { caso: { nomeCompleto: { contains: search, mode: 'insensitive' } } },
        ]
      }

      // Filtros
      if (autorId && autorId !== 'all') where.autorId = autorId
      if (acao && acao !== 'all') where.acao = acao
      if (caseId) where.casoId = caseId

      const hoje = new Date()
      switch (periodo) {
        case 'hoje':
          where.createdAt = { gte: startOfDay(hoje), lte: endOfDay(hoje) }
          break
        case '7dias':
          where.createdAt = { gte: startOfDay(subDays(hoje, 7)) }
          break
        case '30dias':
          where.createdAt = { gte: startOfDay(subDays(hoje, 30)) }
          break
      }

      const [items, total] = await Promise.all([
        prisma.caseLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            autor: { select: { nome: true, cargo: true } },
            caso: { select: { nomeCompleto: true } },
          },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        prisma.caseLog.count({ where }),
      ])

      return reply.send({
        items,
        total,
        totalPages: Math.ceil(total / pageSize),
        page,
        appliedFilters: params,
      })
    } catch (error) {
      console.error("Erro /audit:", error)
      return reply.status(500).send({ message: 'Erro ao buscar logs.' })
    }
  })

  // 2. [GET] /audit/export — Exportar CSV (Para Excel)
  // Rota vital para prestação de contas
  app.get('/audit/export', async (request, reply) => {
    try {
      // Busca os últimos 1000 logs (limite de segurança)
      const logs = await prisma.caseLog.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' },
        include: {
          autor: { select: { nome: true, cargo: true } },
          caso: { select: { nomeCompleto: true } },
        }
      })

      const fileName = `auditoria_sgac_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`
      
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`)

      const csvStream = formatCsv({ headers: true })
      
      // Pipe direto para a resposta (Stream)
      csvStream.pipe(reply.raw)

      logs.forEach(log => {
        csvStream.write({
          Data: formatDate(log.createdAt, 'dd/MM/yyyy HH:mm'),
          Acao: log.acao,
          Autor: log.autor?.nome || 'Sistema',
          Cargo: log.autor?.cargo || 'N/A',
          Caso: log.caso?.nomeCompleto || 'Geral/Sistema',
          Descricao: log.descricao,
          Valor_Anterior: log.valorAnterior || '-',
          Valor_Novo: log.valorNovo || '-'
        })
      })

      csvStream.end()

    } catch (error) {
      console.error("Erro export audit:", error)
      return reply.status(500).send({ message: "Erro ao gerar exportação." })
    }
  })
}