// backend/src/controllers/RMAController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { RMAService } from '../services/RMAService'
import { cache } from '../lib/cache'
import { startOfMonth, endOfMonth } from 'date-fns'
import { CaseStatus } from '@prisma/client'

export class RmaController {
  static async generate(req: FastifyRequest<{ Querystring: { month: number, year: number } }>, reply: FastifyReply) {
    try {
      const { month, year } = req.query
      
      const cacheKey = `rma_report:${year}:${month}`
      const cachedReport = cache.get(cacheKey)
      
      if (cachedReport) {
        reply.header('X-Cache', 'HIT')
        return reply.send(cachedReport)
      }

      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      // Execução Paralela (Copiado da sua rota original, agora organizado)
      const [activeCases, newCases, evolucoesCount, groupParticipants, referralsCRAS, visitasCount] = await Promise.all([
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lte: endDate },
            OR: [{ dataDesligamento: null }, { dataDesligamento: { gt: endDate } }]
          }
        }),
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { gte: startDate, lte: endDate }
          }
        }),
        prisma.evolucao.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: startDate, lte: endDate } } } }),
        prisma.encaminhamento.count({ where: { dataEnvio: { gte: startDate, lte: endDate }, instituicao: { contains: 'CRAS', mode: 'insensitive' } } }),
        prisma.agendamento.count({ where: { data: { gte: startDate, lte: endDate }, titulo: { contains: 'Visita', mode: 'insensitive' } } })
      ])

      const rmaData = RMAService.calculate(activeCases, newCases, endDate)

      const response = {
        ...rmaData,
        bloco2: {
          m1_individual: evolucoesCount,
          m2_grupo: groupParticipants,
          m3_cras: referralsCRAS,
          m4_visitas: visitasCount
        }
      }

      cache.set(cacheKey, response, 1000 * 60 * 60) // 1h
      reply.header('X-Cache', 'MISS')

      return reply.send(response)

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar RMA.', details: String(error) })
    }
  }
}