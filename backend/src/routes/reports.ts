// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { Cargo, CaseStatus, Sexo } from '@prisma/client'

export async function reportRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso negado.' })
      }
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * [GET] /reports/team-overview
   * Retorna a estrutura hierárquica Técnico -> Casos com detalhes completos para tabela
   */
  app.get('/reports/team-overview', async (request, reply) => {
    try {
      // 1. Busca técnicos
      const technicians = await prisma.user.findMany({
        where: {
          cargo: { in: [Cargo.Agente_Social, Cargo.Especialista] },
          ativo: true,
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: 'asc' },
      })

      // 2. Busca casos ativos com TODOS os campos necessários para a tabela
      const activeCases = await prisma.case.findMany({
        where: {
          status: { not: CaseStatus.DESLIGADO },
        },
        select: {
          id: true, 
          nomeCompleto: true, 
          cpf: true,         // [NOVO]
          sexo: true,        // [NOVO]
          urgencia: true,    // [NOVO]
          violacao: true,    // [NOVO]
          dataEntrada: true, // [NOVO]
          status: true,
          agenteAcolhidaId: true, 
          especialistaPAEFIId: true,
          agenteAcolhida: { select: { nome: true } },      // [NOVO] Para exibir nome na tabela
          especialistaPAEFI: { select: { nome: true } },   // [NOVO] Para exibir nome na tabela
        },
        orderBy: { pesoUrgencia: 'desc' } // Ordenar por prioridade dentro da equipe
      })

      // 3. Processamento em memória (Distribuição)
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
          cases: techCases, // Agora contém o objeto completo do caso
        }
      })

      return reply.status(200).send(overview)
    } catch (error) {
      console.error('Erro /reports/team-overview:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // ... (Resto do arquivo mantido igual: /reports/rma)
  app.get('/reports/rma', async (request, reply) => {
    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM).'),
    })

    try {
      const { month } = querySchema.parse(request.query)
      const targetMonth = parseISO(month)
      const firstDay = startOfMonth(targetMonth)
      const lastDay = endOfMonth(targetMonth)

      const initialCount = await prisma.case.count({
        where: {
          status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI,
          dataInicioPAEFI: { lt: firstDay },
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gte: firstDay } },
          ],
        },
      })

      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay },
        },
        select: { id: true, sexo: true, nascimento: true },
      })

      const closedCases = await prisma.case.count({
        where: {
          status: CaseStatus.DESLIGADO,
          dataDesligamento: { gte: firstDay, lte: lastDay },
        },
      })

      const finalCount = initialCount + newEntries.length - closedCases

      const profileBySex = { masculino: 0, feminino: 0, outro: 0 }
      newEntries.forEach(c => {
        if (c.sexo === 'Masculino') profileBySex.masculino++
        else if (c.sexo === 'Feminino') profileBySex.feminino++
        else profileBySex.outro++
      })

      const profileByAgeGroup = {
        '0-6': 0, '7-12': 0, '13-17': 0,
        '18-29': 0, '30-59': 0, '60+': 0,
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

      return reply.status(200).send({
        initialCount,
        newEntries: newEntries.length,
        closedCases,
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