// backend/src/routes/audit.ts
// 🔧 Este arquivo define todas as rotas de auditoria com filtros avançados,
// paginação robusta e segurança reforçada. Código revisado e modernizado.

import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function auditRoutes(app: FastifyInstance) {
  /**
   * 🔐 Middleware global — Apenas Gerentes têm permissão
   */
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }

      if (cargo !== 'Gerente') {
        return reply.status(403).send({ message: 'Acesso restrito à gestão.' })
      }
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * ============================================================
   *  [GET] /audit — Audit Log Global com filtros inteligentes
   * ============================================================
   */
  app.get('/audit', async (request, reply) => {
    // Validação + Tipagem de Query Params
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
      autorId: z.string().uuid().optional(),
      acao: z.string().optional(), // Ex: CRIACAO, DESLIGAMENTO, ATRIBUICAO
      periodo: z.enum(['hoje', '7dias', '30dias', 'tudo']).default('7dias'),
      caseId: z.string().uuid().optional(), // 🔥 NOVO FILTRO
      search: z.string().min(2).optional(), // 🔍 NOVO: Busca textual inteligente
    })

    try {
      const params = querySchema.parse(request.query)
      const { page, pageSize, autorId, acao, periodo, caseId, search } = params

      const where: any = {}

      // 🔍 Filtro textual (Pesquisa inteligente)
      if (search) {
        where.OR = [
          { descricao: { contains: search, mode: 'insensitive' } },
          { autor: { nome: { contains: search, mode: 'insensitive' } } },
          { caso: { nomeCompleto: { contains: search, mode: 'insensitive' } } },
        ]
      }

      // 👤 Filtro por autor
      if (autorId && autorId !== 'all') where.autorId = autorId

      // ⚡ Filtro por ação específica
      if (acao && acao !== 'all') where.acao = acao

      // 📌 Filtro por caso específico
      if (caseId) where.casoId = caseId

      // 🗓️ Filtro por período
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
      return reply.status(500).send({ message: 'Erro ao buscar logs de auditoria.' })
    }
  })
}
