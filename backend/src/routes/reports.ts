// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns'
import { Cargo, CaseStatus } from '@prisma/client'

// Tipagem do Perfil Etário para o TypeScript
type AgeGroup = '0-6' | '7-12' | '13-17' | '18-29' | '30-59' | '60+';

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
   * Visão detalhada da carga de trabalho da equipe técnica
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

      // 2. Busca todos os casos ativos (1 Query Otimizada)
      // Em vez de fazer N queries (uma para cada técnico), fazemos uma e filtramos em memória.
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
          // Não precisamos dos includes complexos aqui, só os IDs bastam para filtrar
        },
        orderBy: { pesoUrgencia: 'desc' }
      })

      // 3. Monta a estrutura em memória
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === Cargo.Agente_Social) {
            // Agente vê seus casos em Acolhida
            return (
              c.agenteAcolhidaId === tech.id && 
              (c.status === CaseStatus.AGUARDANDO_ACOLHIDA || c.status === CaseStatus.EM_ACOLHIDA)
            )
          }
          if (tech.cargo === Cargo.Especialista) {
            // Especialista vê seus casos em PAEFI
            return (
              c.especialistaPAEFIId === tech.id && 
              (c.status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI || c.status === CaseStatus.EM_MONITORAMENTO)
            )
          }
          return false
        })

        return {
          id: tech.id,
          nome: tech.nome,
          cargo: tech.cargo === Cargo.Agente_Social ? 'Agente Social' : 'Especialista',
          cases: techCases,
          caseCount: techCases.length
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
   * Geração do RMA Oficial (Bloco 1 e 2 simplificados)
   */
  app.get('/reports/rma', async (request, reply) => {
    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM).'),
    })

    try {
      const { month } = querySchema.parse(request.query)
      const [year, m] = month.split('-').map(Number)
      
      // Datas UTC para evitar problemas de fuso horário
      const firstDay = new Date(Date.UTC(year, m - 1, 1))
      const lastDay = new Date(Date.UTC(year, m, 0, 23, 59, 59)) // Último dia do mês

      // 1. Contagens do Bloco de Movimentação (PAEFI)
      const [initialCount, newEntriesCount, closedCasesCount] = await Promise.all([
        
        // Volume Inicial (Casos ativos vindos do mês anterior)
        prisma.case.count({
          where: {
            status: { in: [CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO] },
            dataInicioPAEFI: { lt: firstDay }, // Começaram antes deste mês
            OR: [
              { dataDesligamento: null },      // E não acabaram
              { dataDesligamento: { gte: firstDay } }, // Ou acabaram, mas só dentro deste mês (então contam no saldo inicial)
            ],
          },
        }),

        // Novos Casos (Entraram no PAEFI neste mês)
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: firstDay, lte: lastDay },
          },
        }),

        // Desligados (Saíram do PAEFI neste mês)
        prisma.case.count({
          where: {
            status: CaseStatus.DESLIGADO,
            dataDesligamento: { gte: firstDay, lte: lastDay },
          },
        })
      ])

      // 2. Perfil dos Novos Casos (Sexo)
      const sexGroups = await prisma.case.groupBy({
        by: ['sexo'],
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay },
        },
        _count: { sexo: true }
      })

      const profileBySex = {
        masculino: 0,
        feminino: 0,
        outro: 0,
      }

      sexGroups.forEach(g => {
        if (!g.sexo) return;
        const s = g.sexo.toLowerCase();
        if (s === 'masculino') profileBySex.masculino += g._count.sexo;
        else if (s === 'feminino') profileBySex.feminino += g._count.sexo;
        else profileBySex.outro += g._count.sexo;
      });

      // 3. Perfil dos Novos Casos (Idade)
      const newEntriesAges = await prisma.case.findMany({
        where: { dataInicioPAEFI: { gte: firstDay, lte: lastDay } },
        select: { nascimento: true }
      })

      const profileByAgeGroup: Record<AgeGroup, number> = {
        '0-6': 0, '7-12': 0, '13-17': 0,
        '18-29': 0, '30-59': 0, '60+': 0,
      }
      
      const now = new Date()
 
      for (const c of newEntriesAges) {
        if (!c.nascimento) continue;
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