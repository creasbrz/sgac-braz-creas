// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { endOfMonth, startOfMonth, differenceInYears } from 'date-fns'

export async function reportRoutes(app: FastifyInstance) {
  // Rota para gerar os dados agregados do RMA para um mês específico
  app.get(
    '/reports/rma',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const getRmaQuerySchema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/), // Formato YYYY-MM
      })

      const { cargo } = request.user
      if (cargo !== 'Gerente') {
        return await reply.status(403).send({ message: 'Acesso negado.' })
      }

      try {
        const { month } = getRmaQuerySchema.parse(request.query)
        const year = parseInt(month.split('-')[0])
        const monthIndex = parseInt(month.split('-')[1]) - 1

        const startDate = startOfMonth(new Date(year, monthIndex))
        const endDate = endOfMonth(new Date(year, monthIndex))

        // B1: Casos em acompanhamento no INÍCIO do mês
        const initialPaefiCases = await prisma.case.count({
          where: {
            dataInicioPAEFI: {
              lt: startDate, // Começaram antes deste mês
            },
            OR: [
              { dataDesligamento: null }, // E ainda não foram desligados
              { dataDesligamento: { gte: startDate } }, // Ou foram desligados neste mês ou depois
            ],
          },
        })

        // B2: NOVOS casos inseridos em acompanhamento durante o mês
        const newPaefiCases = await prisma.case.findMany({
          where: {
            dataInicioPAEFI: {
              gte: startDate,
              lte: endDate,
            },
          },
        })

        // B3: Casos DESLIGADOS durante o mês
        const closedPaefiCases = await prisma.case.count({
          where: {
            dataInicioPAEFI: {
              not: null, // Garante que eram casos de PAEFI
            },
            dataDesligamento: {
              gte: startDate,
              lte: endDate,
            },
          },
        })
        
        const finalPaefiCases = initialPaefiCases + newPaefiCases.length - closedPaefiCases
        
        // C1: Perfil dos NOVOS casos por sexo
        const profileBySex = newPaefiCases.reduce((acc, curr) => {
            acc[curr.sexo] = (acc[curr.sexo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
        
        const rmaData = {
          initialCount: initialPaefiCases,
          newEntries: newPaefiCases.length,
          closedCases: closedPaefiCases,
          finalCount: finalPaefiCases,
          profileBySex: {
              masculino: profileBySex['Masculino'] || 0,
              feminino: profileBySex['Feminino'] || 0,
              outro: profileBySex['Outro'] || 0,
          },
        }

        return await reply.status(200).send(rmaData)
      } catch (error) {
        request.log.error(error, 'Erro ao gerar relatório RMA.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao gerar relatório.' })
      }
    },
  )
}