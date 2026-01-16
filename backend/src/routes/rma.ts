// backend/src/routes/rma.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'
import { CaseStatus } from '@prisma/client'
import { RMAService } from '../services/RMAService'

export async function rmaRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get('/rma/generate', {
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
      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      // 1. Busca Eficiente de Dados (Paralelismo)
      // Utiliza Promise.all para otimizar o tempo de resposta do servidor
      const [activeCases, newCases, evolucoesCount, groupParticipants, referralsCRAS, visitasCount] = await Promise.all([
        // A.1: Estoque de Casos Ativos no PAEFI
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lte: endDate },
            OR: [
              { dataDesligamento: null },
              { dataDesligamento: { gt: endDate } }
            ]
          }
        }),
        
        // A.2: Novos Casos (Entradas no Mês)
        prisma.case.findMany({
          where: {
            status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { gte: startDate, lte: endDate }
          }
        }),

        // M.1: Atendimentos Individualizados (Evoluções)
        prisma.evolucao.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),

        // M.2: Atendimentos em Grupo
        prisma.groupAttendance.count({
          where: {
            presente: true,
            grupo: { dataRealizacao: { gte: startDate, lte: endDate } }
          }
        }),

        // M.3: Encaminhamentos CRAS
        prisma.encaminhamento.count({
          where: {
            dataEnvio: { gte: startDate, lte: endDate },
            instituicao: { contains: 'CRAS', mode: 'insensitive' }
          }
        }),

        // M.4: Visitas Domiciliares
        prisma.agendamento.count({
          where: {
            data: { gte: startDate, lte: endDate },
            titulo: { contains: 'Visita', mode: 'insensitive' }
          }
        })
      ])

      // 2. Processamento de Regras de Negócio
      // Delega o cálculo estatístico para o Service dedicado
      const rmaData = RMAService.calculate(activeCases, newCases, endDate)

      // 3. Montagem da Resposta
      const response = {
        ...rmaData,
        bloco2: {
          m1_individual: evolucoesCount,
          m2_grupo: groupParticipants,
          m3_cras: referralsCRAS,
          m4_visitas: visitasCount
        }
      }

      return reply.send(response)

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar RMA.', details: String(error) })
    }
  })
}