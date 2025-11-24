// backend/src/routes/reports.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
// [CORREÇÃO IMPORTANTE] Importar Enums para garantir que o Prisma não quebre
import { Cargo, CaseStatus, Sexo } from '@prisma/client'

export async function reportRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      
      // Verifica se é Gerente usando o Enum correto
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso negado.' })
      }
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * [GET] /reports/team-overview
   */
  app.get('/reports/team-overview', async (request, reply) => {
    try {
      // 1. Busca técnicos (Usando Enum)
      const technicians = await prisma.user.findMany({
        where: {
          cargo: {
            in: [Cargo.Agente_Social, Cargo.Especialista], 
          },
          ativo: true,
        },
        select: { id: true, nome: true, cargo: true },
        orderBy: { cargo: 'asc' },
      })

      // 2. Busca casos ativos (Usando Enum)
      const activeCases = await prisma.case.findMany({
        where: {
          status: {
            not: CaseStatus.DESLIGADO, 
          },
        },
        select: {
          id: true, nomeCompleto: true, status: true,
          agenteAcolhidaId: true, especialistaPAEFIId: true,
        },
      })

      // 3. Processamento em memória
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
        }).map(c => ({ id: c.id, nomeCompleto: c.nomeCompleto }))

        return {
          nome: tech.nome,
          // Formata o nome do cargo para ficar bonito na tela (remove o underline)
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
   */
  app.get('/reports/rma', async (request, reply) => {
    const querySchema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM).'),
    })

    try {
      const { month } = querySchema.parse(request.query)
      const targetMonth = parseISO(month)
      const firstDay = startOfMonth(targetMonth)
      const lastDay = endOfMonth(targetMonth)

      // B1: Em acompanhamento no início
      const initialCount = await prisma.case.count({
        where: {
          status: CaseStatus.EM_ACOMPANHAMENTO_PAEFI, // Enum
          dataInicioPAEFI: { lt: firstDay },
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gte: firstDay } },
          ],
        },
      })

      // B2: Novas entradas
      const newEntries = await prisma.case.findMany({
        where: {
          dataInicioPAEFI: { gte: firstDay, lte: lastDay },
        },
        select: { id: true, sexo: true, nascimento: true },
      })

      // B3: Desligados
      const closedCases = await prisma.case.count({
        where: {
          status: CaseStatus.DESLIGADO, // Enum
          dataDesligamento: { gte: firstDay, lte: lastDay },
        },
      })

      // B4: Final
      const finalCount = initialCount + newEntries.length - closedCases

      // C1: Sexo (Usando Enum Sexo)
      const profileBySex = { masculino: 0, feminino: 0, outro: 0 }
      newEntries.forEach(c => {
        if (c.sexo === Sexo.M) profileBySex.masculino++
        else if (c.sexo === Sexo.F) profileBySex.feminino++
        else profileBySex.outro++
      })

      // C2: Idade
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