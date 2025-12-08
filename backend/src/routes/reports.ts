// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns'
import { Cargo, CaseStatus } from '@prisma/client'

export async function reportRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
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

  /**
   * [GET] /reports/team-overview
   * Visão detalhada da equipe. Otimizada para buscar apenas campos necessários.
   */
  app.get('/reports/team-overview', async (request, reply) => {
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

      // 2. Busca casos ativos de uma só vez (reduz N+1 queries)
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: CaseStatus.DESLIGADO },
        },
        select: {
          id: true, 
          nomeCompleto: true, 
          cpf: true,
          sexo: true,
          urgencia: true,
          violacao: true,
          dataEntrada: true,
          status: true,
          agenteAcolhidaId: true, 
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } },
        },
        orderBy: { pesoUrgencia: 'desc' }
      })

      // 3. Monta a estrutura em memória (rápido pois os dados já estão filtrados)
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
              c.status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI
            )
          }
          return false
        })

        return {
          nome: tech.nome,
          cargo: tech.cargo === Cargo.Agente_Social ? 'Agente Social' : 'Especialista',
          cases: techCases,
        }
      })

      return reply.status(200).send(overview)
    } catch (error) {
      console.error('Erro /reports/team-overview:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * [GET] /reports/rma
   * Geração do RMA com Agregações do Banco de Dados (Alta Performance)
   */
  app.get('/reports/rma', async (request, reply) => {
    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM).'),
    })

    try {
      const { month } = querySchema.parse(request.query)
      const targetDate = new Date(month + '-01T00:00:00') // Força ISO start
      const firstDay = startOfMonth(targetDate)
      const lastDay = endOfMonth(targetDate)

      // 1. Contagens Diretas (DB Count)
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        // B1: Saldo anterior
        prisma.case.count({
          where: {
            status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
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

      // 2. Perfil por Sexo (DB GroupBy - Otimizado)
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

      // 3. Perfil Etário
      // Prisma não agrupa por "idade calculada" nativamente sem Raw SQL complexo.
      // Solução híbrida eficiente: Buscar apenas data de nascimento dos novos (payload leve).
      const newEntriesAges = await prisma.case.findMany({
        where: { dataInicioPAEFI: { gte: firstDay, lte: lastDay } },
        select: { nascimento: true }
      })

      const profileByAgeGroup = {
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

      return reply.status(200).send({
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