import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns'
import { CaseStatus } from '@prisma/client'

// --- HELPERS DE CONTADORES ---

// Padrão (B.6, E, G, I): 0-12, 13-17, 18-59, 60+
const createStandardCounter = () => ({
  masculino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  feminino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  total: 0
})

// Crianças/Adolescentes (C.1 a C.4): 0-6, 7-12, 13-17
const createChildCounter = () => ({
  masculino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  feminino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  total: 0
})

// Trabalho Infantil (C.5): 0-12, 13-15 (Até 15 anos)
const createChildLaborCounter = () => ({
  masculino: { a0_12: 0, a13_15: 0 },
  feminino: { a0_12: 0, a13_15: 0 },
  total: 0
})

export async function rmaRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get('/rma/generate', {
    schema: {
      tags: ['Relatórios'],
      querystring: z.object({
        month: z.coerce.number(),
        year: z.coerce.number(),
      })
    }
  }, async (request, reply) => {
    try {
      const { month, year } = request.query
      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      console.log(`[RMA] Gerando competência: ${month}/${year}`)

      // =======================================================================
      // A.1 - TOTAL DE CASOS EM ACOMPANHAMENTO (Estoque)
      // Regra: Casos com status PAEFI ativos no último dia do mês ou desligados APÓS o fim do mês
      // =======================================================================
      const activeCases = await prisma.case.findMany({
        where: {
          // Status de PAEFI
          status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
          // Data de entrada anterior ou igual ao fim do mês
          dataInicioPAEFI: { lte: endDate }, 
          // Não desligado OU desligado após o fechamento do mês
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gt: endDate } }
          ]
        }
      })

      // =======================================================================
      // A.2 - NOVOS CASOS (Entradas no Mês)
      // Regra: Data de Início do PAEFI dentro do mês de referência
      // =======================================================================
      const newCases = await prisma.case.findMany({
        where: {
          status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] },
          dataInicioPAEFI: { gte: startDate, lte: endDate }
        },
        include: { encaminhamentos: true }
      })

      // =======================================================================
      // BLOCO II (M) - PRODUÇÃO
      // =======================================================================
      
      // M.1: Evoluções no mês (Atendimento individualizado)
      const evolucoesCount = await prisma.evolucao.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      })

      // M.2: Participantes em Grupos
      const groupParticipants = await prisma.groupAttendance.count({
        where: {
          presente: true,
          grupo: { dataRealizacao: { gte: startDate, lte: endDate } }
        }
      })

      // M.3: Encaminhamentos para CRAS
      // Busca nos logs de encaminhamento ou tabela de encaminhamentos
      const referralsCRAS = await prisma.encaminhamento.count({
        where: {
          dataEnvio: { gte: startDate, lte: endDate },
          instituicao: { contains: 'CRAS', mode: 'insensitive' }
        }
      })

      // M.4: Visitas Domiciliares (Agendamentos ou Evoluções marcadas como Visita)
      const visitasCount = await prisma.agendamento.count({
        where: {
          data: { gte: startDate, lte: endDate },
          titulo: { contains: 'Visita', mode: 'insensitive' }
        }
      })

      // --- INICIALIZA ESTRUTURA DE RESPOSTA ---
      const stats = {
        bloco1: {
          a1_total: activeCases.length,
          a2_novos: newCases.length,
          // Bloco B
          b1_pbf: 0, b2_bpc: 0, b3_trab_infantil: 0, b4_acolhimento: 0, b5_drogas: 0, b7_mse: 0,
          b6_vitimas: createStandardCounter(),
          // Bloco C
          c1_infamiliar: createChildCounter(), 
          c2_abuso: createChildCounter(), 
          c3_exploracao: createChildCounter(), 
          c4_negligencia: createChildCounter(),
          c5_trab_infantil: createChildLaborCounter(),
          // Bloco D
          d1_violencia: 0, d2_negligencia: 0,
          // Bloco E
          e1_violencia: createStandardCounter(), e2_negligencia: createStandardCounter(),
          // Bloco F
          f1_mulheres: 0,
          // Bloco G
          g1_trafico: createStandardCounter(),
          // Bloco H
          h1_discriminacao: 0,
          // Bloco I
          i1_rua: createStandardCounter()
        },
        bloco2: {
          m1_individual: evolucoesCount,
          m2_grupo: groupParticipants,
          m3_cras: referralsCRAS,
          m4_visitas: visitasCount
        }
      }

      // =======================================================================
      // PROCESSAMENTO DE NOVOS CASOS (PERFIL E DEMOGRAFIA)
      // =======================================================================
      newCases.forEach(c => {
        // Dados Auxiliares
        const age = differenceInYears(endDate, new Date(c.nascimento))
        const sex = (c.sexo && c.sexo.toLowerCase().startsWith('f')) ? 'feminino' : 'masculino'
        const violacoes = c.violacao || []
        const violacoesStr = violacoes.join(' ').toLowerCase()
        const beneficios = c.beneficios || []
        const beneficiosStr = beneficios.join(' ').toLowerCase()
        const isChild = age < 18
        const isElderly = age >= 60
        const isPCD = c.categoria === 'PCD' || c.categoria?.includes('Deficiência')

        // --- BLOCO B: PERFIL FAMÍLIAS ---
        if (beneficiosStr.includes('bolsa família') || beneficiosStr.includes('pbf')) stats.bloco1.b1_pbf++
        if (beneficiosStr.includes('bpc')) stats.bloco1.b2_bpc++
        if (violacoesStr.includes('trabalho infantil')) stats.bloco1.b3_trab_infantil++
        if (isChild && c.urgencia?.toLowerCase().includes('acolhimento')) stats.bloco1.b4_acolhimento++
        if (isChild && c.categoria?.toLowerCase().includes('drogas')) stats.bloco1.b5_drogas++
        if (violacoesStr.includes('medidas socioeducativas')) stats.bloco1.b7_mse++

        // --- BLOCO B.6: DEMOGRAFIA GERAL (VÍTIMAS) ---
        // (Assume-se que o titular é a vítima principal. Idealmente iterar sobre membros vitimados)
        const incStandard = (target: any) => {
          target.total++
          if (age <= 12) target[sex].a0_12++
          else if (age <= 17) target[sex].a13_17++
          else if (age <= 59) target[sex].a18_59++
          else target[sex].a60_mais++
        }
        incStandard(stats.bloco1.b6_vitimas)

        // --- BLOCO C: CRIANÇAS E ADOLESCENTES (0-17) ---
        if (isChild) {
          const incChild = (target: any) => {
            target.total++
            if (age <= 6) target[sex].a0_6++
            else if (age <= 12) target[sex].a7_12++
            else target[sex].a13_17++ // Até 17
          }

          // C.1 Violência Intrafamiliar (Física/Psico)
          if (violacoesStr.includes('física') || violacoesStr.includes('psicológica')) {
             incChild(stats.bloco1.c1_infamiliar)
          }
          // C.2 Abuso Sexual
          if (violacoesStr.includes('abuso sexual')) {
             incChild(stats.bloco1.c2_abuso)
          }
          // C.3 Exploração Sexual
          if (violacoesStr.includes('exploração sexual')) {
             incChild(stats.bloco1.c3_exploracao)
          }
          // C.4 Negligência/Abandono
          if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) {
             incChild(stats.bloco1.c4_negligencia)
          }
          // C.5 Trabalho Infantil (Até 15 anos)
          if (violacoesStr.includes('trabalho infantil')) {
             if (age <= 15) {
               stats.bloco1.c5_trab_infantil.total++
               if (age <= 12) stats.bloco1.c5_trab_infantil[sex].a0_12++
               else stats.bloco1.c5_trab_infantil[sex].a13_15++
             }
          }
        }

        // --- BLOCO D: IDOSOS (60+) ---
        if (isElderly) {
          // D.1 Física, Psico, Sexual
          if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) {
            stats.bloco1.d1_violencia++
          }
          // D.2 Negligência/Abandono
          if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) {
            stats.bloco1.d2_negligencia++
          }
        }

        // --- BLOCO E: PCD ---
        if (isPCD) {
          // E.1 Violência Física, Psico, Sexual
          if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) {
            incStandard(stats.bloco1.e1_violencia)
          }
          // E.2 Negligência/Abandono
          if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) {
            incStandard(stats.bloco1.e2_negligencia)
          }
        }

        // --- BLOCO F: MULHERES (18-59) ---
        if (sex === 'feminino' && age >= 18 && age <= 59) {
          if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) {
            stats.bloco1.f1_mulheres++
          }
        }

        // --- BLOCO G: TRÁFICO ---
        if (violacoesStr.includes('tráfico')) {
          incStandard(stats.bloco1.g1_trafico)
        }

        // --- BLOCO H: DISCRIMINAÇÃO ---
        if (c.categoria === 'LGBTQIA+' || violacoesStr.includes('discriminação')) {
          stats.bloco1.h1_discriminacao++
        }

        // --- BLOCO I: POP RUA ---
        if (c.categoria === 'POP RUA' || c.categoria?.includes('Rua')) {
          incStandard(stats.bloco1.i1_rua)
        }
      })

      return reply.send(stats)

    } catch (error) {
      console.error('[RMA ERROR]', error)
      return reply.status(500).send({ message: 'Erro ao gerar RMA', detail: String(error) })
    }
  })
}