// backend/src/routes/stats.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function statsRoutes(app: FastifyInstance) {
  app.get(
    '/stats',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { cargo } = request.user

      if (cargo !== 'Gerente') {
        return await reply.status(403).send({ message: 'Acesso negado.' })
      }

      try {
        const now = new Date()
        const startOfCurrentMonth = startOfMonth(now)
        const endOfCurrentMonth = endOfMonth(now)

        const [
          casesByViolation,
          casesByCategory,
          casesByUrgency,
          casesBySex, // Novo dado
          totalCases,
          statusCounts,
          newCasesThisMonth,
          closedCasesThisMonth,
          workloadByAgent,
          workloadBySpecialist,
        ] = await Promise.all([
          prisma.case.groupBy({ by: ['violacao'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
          prisma.case.groupBy({ by: ['categoria'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
          prisma.case.groupBy({ by: ['urgencia'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
          prisma.case.groupBy({ by: ['sexo'], _count: { id: true } }), // Novo cálculo
          prisma.case.count(),
          prisma.case.groupBy({ by: ['status'], _count: { id: true } }),
          prisma.case.count({ where: { createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } } }),
          prisma.case.count({ where: { dataDesligamento: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } } }),
          prisma.case.groupBy({ by: ['agenteAcolhidaId'], _count: { id: true }, where: { agenteAcolhidaId: { not: null }, status: 'EM_ACOLHIDA' } }),
          prisma.case.groupBy({ by: ['especialistaPAEFIId'], _count: { id: true }, where: { especialistaPAEFIId: { not: null }, status: 'EM_ACOMPANHAMENTO_PAEFI' } }),
        ])

        const agentIds = workloadByAgent.map((p) => p.agenteAcolhidaId!)
        const specialistIds = workloadBySpecialist.map((p) => p.especialistaPAEFIId!)
        
        const users = await prisma.user.findMany({ where: { id: { in: [...agentIds, ...specialistIds] }}, select: { id: true, nome: true } })
        const userMap = new Map(users.map(u => [u.id, u.nome]))

        const stats = {
          totalCases,
          newCasesThisMonth,
          closedCasesThisMonth,
          acolhidasCount: statusCounts.find((s) => s.status === 'EM_ACOLHIDA')?._count.id || 0,
          acompanhamentosCount: statusCounts.find((s) => s.status === 'EM_ACOMPANHAMENTO_PAEFI')?._count.id || 0,
          casesByViolation: casesByViolation.map((item) => ({ name: item.violacao, value: item._count.id })),
          casesByCategory: casesByCategory.map((item) => ({ name: item.categoria, value: item._count.id })),
          casesByUrgency: casesByUrgency.map((item) => ({ name: item.urgencia, value: item._count.id })),
          casesBySex: casesBySex.map((item) => ({ name: item.sexo, value: item._count.id })), // Novo mapeamento
          workloadByAgent: workloadByAgent.map(p => ({ name: userMap.get(p.agenteAcolhidaId!) ?? 'Desconhecido', value: p._count.id })).sort((a, b) => b.value - a.value),
          workloadBySpecialist: workloadBySpecialist.map(p => ({ name: userMap.get(p.especialistaPAEFIId!) ?? 'Desconhecido', value: p._count.id })).sort((a, b) => b.value - a.value),
        }

        return await reply.status(200).send(stats)
      } catch (error) {
        request.log.error(error, 'Erro ao buscar estatísticas.')
        return await reply.status(500).send({ message: 'Erro interno ao buscar estatísticas.' })
      }
    },
  )
}