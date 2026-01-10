// backend/src/routes/reports.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns'
import { Cargo, CaseStatus } from '@prisma/client'

// --- Schemas ---

const teamOverviewResponseSchema = z.array(z.object({
  nome: z.string(),
  cargo: z.string(),
  cases: z.array(z.object({
    id: z.string(),
    nomeCompleto: z.string(),
    status: z.string(),
    urgencia: z.string(),
    violacao: z.string()
  }))
}))

const rmaResponseSchema = z.object({
  initialCount: z.number(),
  newEntries: z.number(),
  closedCases: z.number(),
  finalCount: z.number(),
  profileBySex: z.record(z.number()),
  profileByAgeGroup: z.record(z.number())
})

export async function reportRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso negado. Apenas Gerência.' })
      }
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [GET] Visão Geral da Equipe (Carga de Trabalho Detalhada)
  server.get('/reports/team-overview', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Carga de trabalho detalhada por técnico',
      response: {
        200: teamOverviewResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // 1. Busca técnicos ativos
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [Cargo.Agente_Social, Cargo.Especialista] },
          ativo: true,
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: 'asc' },
      })

      // 2. Busca casos ativos de uma só vez (Evita N+1)
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: CaseStatus.DESLIGADO },
        },
        // SELECT MÍNIMO para performance
        select: {
          id: true, 
          nomeCompleto: true, 
          status: true,
          urgencia: true,
          violacao: true,
          agenteAcolhidaId: true, 
          especialistaPAEFIId: true,
        },
        orderBy: { pesoUrgencia: 'desc' }
      })

      // 3. Cruzamento em Memória (Rápido para < 5000 casos)
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === Cargo.Agente_Social) {
            return (
              c.agenteAcolhidaId === tech.id && 
              (c.status === CaseStatus.AGUARDANDO_ACOLHIDA || c.status === CaseStatus.EM_ACOLHIDA)
            )
          }
          if (tech.cargo === Cargo.Especialista) {
            return (
              c.especialistaPAEFIId === tech.id && 
              (c.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA || c.status === CaseStatus.EM_ACOMPANHAMENTO || c.status === CaseStatus.EM_MONITORAMENTO)
            )
          }
          return false
        })

        return {
          nome: tech.nome,
          cargo: tech.cargo === Cargo.Agente_Social ? 'Agente Social' : 'Especialista',
          cases: techCases, // Retorna os objetos filtrados
        }
      })

      return reply.send(overview)

    } catch (error) {
      console.error('Erro /reports/team-overview:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 2. [GET] Relatório Mensal de Atendimentos (RMA)
  server.get('/reports/rma', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Dados para preenchimento do RMA (MDS)',
      querystring: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM).'),
      }),
      response: {
        200: rmaResponseSchema
      }
    }
  }, async (request, reply) => {
    const { month } = request.query
    const targetDate = new Date(month + '-01T00:00:00')
    const firstDay = startOfMonth(targetDate)
    const lastDay = endOfMonth(targetDate)

    try {
      // 1. Contagens Diretas (DB Count)
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // B1: Saldo anterior (Ativos antes do mês começar e não desligados antes)
        prisma.case.count({
          where: {
            status: CaseStatus.EM_ACOMPANHAMENTO,
            dataInicioPAEFI: { lt: firstDay },
            OR: [
              { dataDesligamento: null },
              { dataDesligamento: { gte: firstDay } },
            ],
          },
        }),
        // B2: Novos entrados no mês
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay },
          },
        }),
        // B3: Desligados no mês
        prisma.case.count({
          where: {
            status: CaseStatus.DESLIGADO,
            dataDesligamento: { gte: firstDay, lte: lastDay },
          },
        })
      ])

      // 2. Perfil por Sexo (DB GroupBy)
      const sexGroups = await prisma.case.groupBy({
        by: ['sexo'],
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay },
        },
        _count: { sexo: true }
      })

      const profileBySex = {
        masculino: sexGroups.find(g => g.sexo === 'Masculino')?._count.sexo || 0,
        feminino: sexGroups.find(g => g.sexo === 'Feminino')?._count.sexo || 0,
        outro: sexGroups.find(g => !['Masculino', 'Feminino'].includes(g.sexo))?._count.sexo || 0,
      }

      // 3. Perfil Etário (Híbrido: Select leve + Loop em memória)
      const newEntriesAges = await prisma.case.findMany({
        where: { dataInicioPAEFI: { gte: firstDay, lte: lastDay } },
        select: { nascimento: true }
      })

      const profileByAgeGroup: Record<string, number> = {
        '0-6': 0, '7-12': 0, '13-17': 0,
        '18-29': 0, '30-59': 0, '60+': 0,
      }
      
      const now = new Date()
 
      for (const c of newEntriesAges) {
        const age = differenceInYears(now, c.nascimento)
        if (age <= 6) profileByAgeGroup['0-6']++
        else if (age <= 12) profileByAgeGroup['7-12']++
        else if (age <= 17) profileByAgeGroup['13-17']++
        else if (age <= 29) profileByAgeGroup['18-29']++
        else if (age <= 59) profileByAgeGroup['30-59']++
        else profileByAgeGroup['60+']++
      }

      const finalCount = initialCount + newEntriesCount - closedCasesCount

      return reply.send({
        initialCount,
        newEntries: newEntriesCount,
        closedCases: closedCasesCount,
        finalCount,
        profileBySex,
        profileByAgeGroup,
      })

    } catch (error) {
      console.error('Erro /reports/rma:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}