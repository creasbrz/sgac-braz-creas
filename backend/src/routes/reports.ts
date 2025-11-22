// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma' //
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns'

export async function reportRoutes(app: FastifyInstance) {
  // Protege todas as rotas de relatórios
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      // Garante que apenas Gerentes acessem relatórios
      const { cargo } = request.user as { cargo: string }
      if (cargo !== 'Gerente') {
        return reply.status(403).send({ message: 'Acesso negado. Apenas gerentes podem ver relatórios.' })
      }
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /reports/team-overview
   * -----------------------------------------------------------------
   * Gera dados para a página 'TeamOverview.tsx'.
   * Lista todos os técnicos ativos e seus casos ativos associados.
   */
  app.get('/reports/team-overview', async (request, reply) => {
    try {
      // 1. Busca todos os Agentes Sociais e Especialistas que estão ativos
      const technicians = await prisma.user.findMany({
        where: {
          cargo: {
            in: ['Agente Social', 'Especialista'],
          },
          ativo: true, //
        },
        select: {
          id: true,
          nome: true,
          cargo: true,
        },
        orderBy: {
          cargo: 'asc',
        },
      })

      // 2. Busca todos os casos ativos (não desligados)
      const activeCases = await prisma.case.findMany({
        where: {
          status: {
            not: 'DESLIGADO',
          },
        },
        select: {
          id: true,
          nomeCompleto: true,
          status: true,
          agenteAcolhidaId: true, //
          especialistaPAEFIId: true, //
        },
      })

      // 3. Combina os dados no frontend (ou aqui, se preferir)
      // Vamos formatar no backend para facilitar para o frontend
      const overview = technicians.map((tech) => {
        const techCases = activeCases.filter((c) => {
          if (tech.cargo === 'Agente Social') {
            return c.agenteAcolhidaId === tech.id && (c.status === 'AGUARDANDO_ACOLHIDA' || c.status === 'EM_ACOLHIDA')
          }
          if (tech.cargo === 'Especialista') {
            return c.especialistaPAEFIId === tech.id && c.status === 'EM_ACOMPANHAMENTO_PAEFI'
          }
          return false
        }).map(c => ({ id: c.id, nomeCompleto: c.nomeCompleto })) //

        return {
          nome: tech.nome, //
          cargo: tech.cargo, //
          cases: techCases, //
        }
      })

      return reply.status(200).send(overview)
    } catch (error) {
      console.error('Erro ao gerar relatório de equipe:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /reports/rma
   * -----------------------------------------------------------------
   * Gera dados para o Relatório Mensal de Atendimentos (RMA).
   *
   * Query Params:
   * - month (obrigatório): Mês no formato 'yyyy-MM'.
   */
  app.get('/reports/rma', async (request, reply) => {
    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mês inválido. Use YYYY-MM.'),
    })

    try {
      const { month } = querySchema.parse(request.query)
      const targetMonth = parseISO(month)
      const firstDay = startOfMonth(targetMonth)
      const lastDay = endOfMonth(targetMonth)
      const firstDayOfPreviousMonth = startOfMonth(subMonths(targetMonth, 1))
      const lastDayOfPreviousMonth = endOfMonth(subMonths(targetMonth, 1))

      // B1: Contagem no início do mês
      const initialCount = await prisma.case.count({
        where: {
          status: 'EM_ACOMPANHAMENTO_PAEFI',
          dataInicioPAEFI: {
            lt: firstDay, // Começou antes do início deste mês
          },
          OR: [
            { dataDesligamento: null }, // Ainda ativo
            { dataDesligamento: { gte: firstDay } }, // Ou foi desligado *neste* mês (contava no início)
          ],
        },
      })

      // B2: Novas entradas no PAEFI no mês
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: {
            gte: firstDay,
            lte: lastDay,
          },
        },
        select: {
          id: true,
          sexo: true,
          nascimento: true,
        },
      })

      // B3: Desligados no mês
      const closedCases = await prisma.case.count({
        where: {
          status: 'DESLIGADO',
          dataDesligamento: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      })

      // B4: Total no final do mês
      const finalCount = initialCount + newEntries.length - closedCases //

      // C1: Perfil por Sexo (dos novos casos)
      const profileBySex = { masculino: 0, feminino: 0, outro: 0 } //
      newEntries.forEach(c => {
        if (c.sexo === 'Masculino') profileBySex.masculino++
        else if (c.sexo === 'Feminino') profileBySex.feminino++
        else profileBySex.outro++
      })

      // C2: Perfil por Faixa Etária (dos novos casos)
      const profileByAgeGroup = { //
        '0-6': 0,
        '7-12': 0,
        '13-17': 0,
        '18-29': 0,
        '30-59': 0,
        '60+': 0,
      }
      const now = new Date()
      newEntries.forEach(c => {
        const age = now.getFullYear() - new Date(c.nascimento).getFullYear()
        if (age <= 6) profileByAgeGroup['0-6']++
        else if (age <= 12) profileByAgeGroup['7-12']++
        else if (age <= 17) profileByAgeGroup['13-17']++
        else if (age <= 29) profileByAgeGroup['18-29']++
        else if (age <= 59) profileByAgeGroup['30-59']++
        else profileByAgeGroup['60+']++
      })

      const rmaData: RmaData = { //
        initialCount,
        newEntries: newEntries.length,
        closedCases,
        finalCount,
        profileBySex,
        profileByAgeGroup,
      }

      return reply.status(200).send(rmaData)

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten() })
      }
      console.error('Erro ao gerar relatório RMA:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}

// Interface auxiliar para o tipo RmaData (baseado no frontend)
interface RmaData {
  initialCount: number
  newEntries: number
  closedCases: number
  finalCount: number
  profileBySex: {
    masculino: number
    feminino: number
    outro: number
  }
  profileByAgeGroup: {
    '0-6': number
    '7-12': number
    '13-17': number
    '18-29': number
    '30-59': number
    '60+': number
  }
}