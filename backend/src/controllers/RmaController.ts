// backend/src/controllers/RMAController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { startOfMonth, endOfMonth } from 'date-fns'
import { CaseStatus } from '@prisma/client'
import { z } from 'zod'

export class RmaController {
  
  static async getRma(req: FastifyRequest<{ Querystring: { month: number, year: number } }>, reply: FastifyReply) {
    try {
      // Validação
      const querySchema = z.object({
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2020)
      })

      const { month, year } = querySchema.parse(req.query)
      
      const cacheKey = `rma_report:${year}:${month}`
      const cachedReport = cache.get(cacheKey)
      
      if (cachedReport) {
        reply.header('X-Cache', 'HIT')
        return reply.send(cachedReport)
      }

      // Definição do Período
      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      // Execução Paralela de Queries
      const [activeCases, newCases, evolucoesCount, groupParticipants, referralsCRAS, visitasCount] = await Promise.all([
        // 1. Casos Ativos no fim do período
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lte: endDate },
            OR: [{ dataDesligamento: null }, { dataDesligamento: { gt: endDate } }],
            // [CORREÇÃO] 'familia: true' removido daqui (estava errado dentro do where)
          },
          include: { familia: true } // [CORREÇÃO] Lugar correto para incluir relacionamento
        }),

        // 2. Novos Casos no período
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { gte: startDate, lte: endDate }
          }
        }),

        // 3. Atendimentos Individualizados (Evoluções)
        // [CORREÇÃO] Alterado de 'evolution' para 'evolucao' (conforme seu schema)
        prisma.evolucao.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),

        // 4. Atendimentos Coletivos (Presenças)
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: startDate, lte: endDate } } } }),

        // 5. Encaminhamentos para CRAS
        prisma.encaminhamento.count({ where: { dataEnvio: { gte: startDate, lte: endDate }, instituicao: { contains: 'CRAS', mode: 'insensitive' } } }),

        // 6. Visitas Domiciliares
        prisma.agendamento.count({ where: { data: { gte: startDate, lte: endDate }, titulo: { contains: 'Visita', mode: 'insensitive' } } })
      ])

      // Cálculo Lógico
      // [CORREÇÃO] Tipagem explícita no reduce para evitar erro 'implicitly has an 'any' type'
      const pessoasAtendidas = activeCases.reduce((acc: number, c: any) => {
        return acc + 1 + (c.familia?.length || 0)
      }, 0)

      const bloco1 = {
        novos: newCases.length,
        ativos: activeCases.length,
        pessoasAtendidas: pessoasAtendidas
      }

      const response = {
        periodo: `${month}/${year}`,
        bloco1,
        bloco2: {
          m1_individual: evolucoesCount,
          m2_grupo: groupParticipants,
          m3_cras: referralsCRAS,
          m4_visitas: visitasCount
        },
        generatedAt: new Date()
      }

      cache.set(cacheKey, response, 1000 * 60 * 60) // Cache por 1h
      reply.header('X-Cache', 'MISS')

      return reply.send(response)

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar RMA.', details: String(error) })
    }
  }
}