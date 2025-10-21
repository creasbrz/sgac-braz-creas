// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { endOfMonth, startOfMonth, differenceInYears, isValid } from 'date-fns'

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

        const finalPaefiCases =
          initialPaefiCases + newPaefiCases.length - closedPaefiCases

        // Bloco C: Perfil dos NOVOS casos
        const profileBySex = newPaefiCases.reduce(
          (acc, curr) => {
            const key = curr.sexo || 'NaoInformado'
            acc[key] = (acc[key] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        const profileByAgeGroup = newPaefiCases.reduce(
          (acc, curr) => {
            let group = 'NaoInformado'
            if (curr.nascimento && isValid(new Date(curr.nascimento))) {
              const age = differenceInYears(new Date(), curr.nascimento)
              if (age >= 0 && age <= 6) group = '0-6'
              else if (age <= 12) group = '7-12'
              else if (age <= 17) group = '13-17'
              else if (age <= 29) group = '18-29'
              else if (age <= 59) group = '30-59'
              else if (age >= 60) group = '60+'
            }
            acc[group] = (acc[group] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

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
          profileByAgeGroup: {
            '0-6': profileByAgeGroup['0-6'] || 0,
            '7-12': profileByAgeGroup['7-12'] || 0,
            '13-17': profileByAgeGroup['13-17'] || 0,
            '18-29': profileByAgeGroup['18-29'] || 0,
            '30-59': profileByAgeGroup['30-59'] || 0,
            '60+': profileByAgeGroup['60+'] || 0,
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

  // Nova rota para a Visão Geral da Equipe (Gerente)
  app.get(
    '/reports/team-overview',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      if (request.user.cargo !== 'Gerente') {
        return await reply.status(403).send({ message: 'Acesso negado.' })
      }

      try {
        const activeCases = await prisma.case.findMany({
          where: {
            status: {
              in: ['EM_ACOLHIDA', 'EM_ACOMPANHAMENTO_PAEFI'],
            },
          },
          select: {
            id: true,
            nomeCompleto: true,
            status: true,
            agenteAcolhida: {
              select: { id: true, nome: true },
            },
            especialistaPAEFI: {
              select: { id: true, nome: true },
            },
          },
        })
        
        const technicians = new Map<string, { nome: string, cargo: string, cases: any[] }>()

        activeCases.forEach(c => {
          let tech = null
          if (c.status === 'EM_ACOLHIDA' && c.agenteAcolhida) {
            tech = { ...c.agenteAcolhida, cargo: 'Agente Social' }
          } else if (c.status === 'EM_ACOMPANHAMENTO_PAEFI' && c.especialistaPAEFI) {
            tech = { ...c.especialistaPAEFI, cargo: 'Especialista' }
          }

          if (tech) {
            if (!technicians.has(tech.id)) {
              technicians.set(tech.id, { nome: tech.nome, cargo: tech.cargo, cases: [] })
            }
            technicians.get(tech.id)?.cases.push({
              id: c.id,
              nomeCompleto: c.nomeCompleto,
            })
          }
        })
        
        const overview = Array.from(technicians.values()).sort((a,b) => a.nome.localeCompare(b.nome))

        return await reply.status(200).send(overview)
      } catch (error) {
        request.log.error(error, 'Erro ao gerar visão da equipe.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao gerar relatório.' })
      }
    },
  )
}

