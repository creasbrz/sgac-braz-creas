// backend/src/routes/rma.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'
import { CaseStatus } from '@prisma/client'
import { RMAService } from '../services/RMAService'
import { cache } from '../lib/cache'

export async function rmaRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get('/generate', { // Rota final: /api/rma/generate
    schema: {
      tags: ['Relatórios'],
      summary: 'Gerar relatório RMA completo (Mensal)',
      querystring: z.object({
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2020),
      })
    }
  }, async (request, reply) => {
    try {
      const { month, year } = request.query
      
      const cacheKey = `rma_v2:${year}:${month}`
      const cachedReport = cache.get(cacheKey)
      
      if (cachedReport) {
        reply.header('X-Cache', 'HIT')
        return reply.send(cachedReport)
      }

      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      // 1. Buscas no Banco
      const [activeCasesCount, newCases, evolucoesCount, groupParticipants, referralsCRAS, visitasCount] = await Promise.all([
        // A.1: Apenas Contagem do Estoque Total
        prisma.case.count({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lte: endDate },
            OR: [{ dataDesligamento: null }, { dataDesligamento: { gt: endDate } }]
          }
        }),
        
        // A.2: Novos Casos (DADOS COMPLETOS para cálculo demográfico)
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { gte: startDate, lte: endDate }
          },
          select: {
            id: true,
            nascimento: true,
            sexo: true,
            violacao: true,
            beneficios: true,
            categoria: true,
            urgencia: true
          }
        }),

        // M.1: Atendimentos
        prisma.evolucao.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        // M.2: Grupos
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: startDate, lte: endDate } } } }),
        // M.3: CRAS
        prisma.encaminhamento.count({ where: { dataEnvio: { gte: startDate, lte: endDate }, instituicao: { contains: 'CRAS', mode: 'insensitive' } } }),
        // M.4: Visitas
        prisma.agendamento.count({ where: { data: { gte: startDate, lte: endDate }, titulo: { contains: 'Visita', mode: 'insensitive' } } })
      ])

      // 2. Calcular Bloco 1 (Demografia complexa)
      const bloco1Data = RMAService.calculate(activeCasesCount, newCases, endDate)

      // 3. Montar Resposta Final
      const response = {
        periodo: `${month}/${year}`,
        generatedAt: new Date(),
        bloco1: bloco1Data,
        bloco2: {
          m1_individual: evolucoesCount,
          m2_grupo: groupParticipants,
          m3_cras: referralsCRAS,
          m4_visitas: visitasCount
        }
      }

      cache.set(cacheKey, response, 1000 * 60 * 60)
      reply.header('X-Cache', 'MISS')

      return reply.send(response)

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar RMA.', details: String(error) })
    }
  })
}