// backend/src/routes/stats.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function statsRoutes(app: FastifyInstance) {
  // Rota para buscar as estatísticas agregadas para o painel gerencial
  app.get(
    '/stats',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { cargo } = request.user

      if (cargo !== 'Gerente') {
        return await reply.status(403).send({ message: 'Acesso negado.' })
      }

      try {
        const [
          casesByViolation,
          casesByCategory,
          casesByUrgency,
          totalCases,
          statusCounts,
          productivityByAgent,
          productivityBySpecialist,
        ] = await Promise.all([
          prisma.case.groupBy({
            by: ['violacao'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
          }),
          prisma.case.groupBy({
            by: ['categoria'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
          }),
          prisma.case.groupBy({
            by: ['urgencia'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
          }),
          prisma.case.count(),
          prisma.case.groupBy({
            by: ['status'],
            _count: { id: true },
          }),
          // Produtividade: Agentes de Acolhida
          prisma.case.groupBy({
            by: ['agenteAcolhidaId'],
            _count: { id: true },
            where: { agenteAcolhidaId: { not: null } },
          }),
          // Produtividade: Especialistas PAEFI
          prisma.case.groupBy({
            by: ['especialistaPAEFIId'],
            _count: { id: true },
            where: { especialistaPAEFIId: { not: null } },
          }),
        ])

        const agentIds = productivityByAgent.map((p) => p.agenteAcolhidaId!)
        const specialistIds = productivityBySpecialist.map(
          (p) => p.especialistaPAEFIId!,
        )

        const users = await prisma.user.findMany({
          where: { id: { in: [...agentIds, ...specialistIds] } },
          select: { id: true, nome: true },
        })

        const userMap = new Map(users.map((u) => [u.id, u.nome]))

        const stats = {
          totalCases,
          casesByViolation: casesByViolation.map((item) => ({
            name: item.violacao,
            value: item._count.id,
          })),
          casesByCategory: casesByCategory.map((item) => ({
            name: item.categoria,
            value: item._count.id,
          })),
          casesByUrgency: casesByUrgency.map((item) => ({
            name: item.urgencia,
            value: item._count.id,
          })),
          acolhidasCount:
            statusCounts.find((s) => s.status === 'EM_ACOLHIDA')?._count.id || 0,
          acompanhamentosCount:
            statusCounts.find((s) => s.status === 'EM_ACOMPANHAMENTO_PAEFI')
              ?._count.id || 0,
          productivity: [
            ...productivityByAgent.map((p) => ({
              name: userMap.get(p.agenteAcolhidaId!) ?? 'Desconhecido',
              value: p._count.id,
            })),
            ...productivityBySpecialist.map((p) => ({
              name: userMap.get(p.especialistaPAEFIId!) ?? 'Desconhecido',
              value: p._count.id,
            })),
          ],
        }

        return await reply.status(200).send(stats)
      } catch (error) {
        request.log.error(error, 'Erro ao buscar estatísticas.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao buscar estatísticas.' })
      }
    },
  )
}

