import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfMonth, endOfMonth, differenceInYears } from 'date-fns'

// --- HELPERS ESTRUTURAIS ---

// Cria o contador padrão para tabelas demográficas (B.6, G.1, etc.)
// Faixas: 0-12, 13-17, 18-59, 60+
const createStandardCounter = () => ({
  masculino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  feminino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  total: 0
})

// Cria o contador específico para o Bloco C (Crianças)
// Faixas: 0-6, 7-12, 13-17
const createChildCounter = () => ({
  masculino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  feminino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  total: 0
})

// Cria o contador específico para Trabalho Infantil (C.5)
// Faixas: 0-12, 13-15 (O formulário pede até 15 anos)
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
      // Mês no JS Date inicia em 0
      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      console.log(`[RMA] Processando ${month}/${year}...`)

      // 1. Busca UNIVERSO DE CASOS (Ativos no mês)
      const allActiveCases = await prisma.case.findMany({
        where: {
          dataEntrada: { lte: endDate },
          OR: [
            { dataDesligamento: null },
            { dataDesligamento: { gte: startDate } }
          ]
        },
        // [ATENÇÃO] Não usamos 'include' para arrays escalares como beneficios/violacao
        include: {
          encaminhamentos: {
            where: { dataEnvio: { gte: startDate, lte: endDate } }
          }
        }
      })

      // 2. Busca DADOS DE PRODUÇÃO (Agendamentos e Grupos)
      // M.1 e M.4: Baseado em Agendamentos
      const appointments = await prisma.agendamento.findMany({
        where: { data: { gte: startDate, lte: endDate } }
      })

      // M.2: Baseado em Presença em Grupos
      const groupAttendances = await prisma.groupAttendance.count({
        where: {
          presente: true,
          grupo: { dataRealizacao: { gte: startDate, lte: endDate } }
        }
      })

      // --- INICIALIZAÇÃO DA MATRIZ DE DADOS ---
      const stats = {
        bloco1: {
          // A. Volume
          a1_total_acompanhamento: allActiveCases.length,
          a2_novos_casos: 0,

          // B. Perfil Novos
          b1_bolsa_familia: 0,
          b2_bpc: 0,
          b3_trabalho_infantil: 0,
          b4_acolhimento: 0,
          b5_drogas: 0,
          b6_vitimas: createStandardCounter(),
          b7_mse: 0,

          // C. Crianças/Adolescentes (Novos)
          c1_violencia_intrafamiliar: createChildCounter(),
          c2_abuso_sexual: createChildCounter(),
          c3_exploracao_sexual: createChildCounter(),
          c4_negligencia: createChildCounter(),
          c5_trabalho_infantil: createChildLaborCounter(),

          // D. Idosos (Novos)
          d1_fisica_psico: 0,
          d2_negligencia: 0,

          // E. PCD (Novos)
          e1_intrafamiliar: createStandardCounter(),
          e2_negligencia: createStandardCounter(),

          // F. Mulheres (Novos)
          f1_violencia: 0,

          // G. Tráfico (Novos)
          g1_trafico: createStandardCounter(),

          // H. Discriminação (Novos)
          h1_discriminacao: 0,

          // I. Pop Rua (Novos)
          i1_rua: createStandardCounter(),
        },
        bloco2: {
          m1_individualizados: 0,
          m2_grupo: groupAttendances,
          m3_encaminhamentos_cras: 0, // Será calculado via loop ou count direto
          m4_visitas: 0
        }
      }

      // --- PROCESSAMENTO BLOCO I (CASOS) ---
      allActiveCases.forEach(c => {
        // Definição de Caso Novo (Inserido neste mês)
        const isNew = c.dataEntrada >= startDate && c.dataEntrada <= endDate
        
        if (isNew) {
          stats.bloco1.a2_novos_casos++

          // Normalização de arrays
          const beneficios = c.beneficios || []
          const violacoes = c.violacao || []
          const violacoesStr = violacoes.join(' ').toLowerCase()
          
          // --- B. Perfil (Famílias) ---
          if (beneficios.some(b => b.toLowerCase().includes('bolsa'))) stats.bloco1.b1_bolsa_familia++
          if (beneficios.some(b => b.toLowerCase().includes('bpc'))) stats.bloco1.b2_bpc++
          if (violacoesStr.includes('trabalho infantil')) stats.bloco1.b3_trabalho_infantil++
          if (violacoesStr.includes('acolhimento')) stats.bloco1.b4_acolhimento++
          if (violacoesStr.includes('drogas') || c.categoria?.toLowerCase().includes('drogas')) stats.bloco1.b5_drogas++
          if (violacoesStr.includes('mse') || c.categoria?.toLowerCase().includes('mse')) stats.bloco1.b7_mse++

          // --- Demografia para tabelas detalhadas ---
          const age = differenceInYears(endDate, new Date(c.nascimento))
          const sex = (c.sexo && c.sexo.toLowerCase().startsWith('f')) ? 'feminino' : 'masculino'
          
          // Função auxiliar para incrementar B.6, E, G, I (Padrão: 0-12, 13-17, 18-59, 60+)
          const incStandard = (counter: any) => {
            counter.total++
            if (age <= 12) counter[sex].a0_12++
            else if (age <= 17) counter[sex].a13_17++
            else if (age <= 59) counter[sex].a18_59++
            else counter[sex].a60_mais++
          }

          // Função auxiliar para Bloco C (Padrão: 0-6, 7-12, 13-17)
          const incChild = (counter: any) => {
            if (age >= 18) return // Segurança
            counter.total++
            if (age <= 6) counter[sex].a0_6++
            else if (age <= 12) counter[sex].a7_12++
            else counter[sex].a13_17++
          }

          // B.6 - Total Vitimados (Novos)
          incStandard(stats.bloco1.b6_vitimas)

          // C - Crianças e Adolescentes (< 18)
          if (age < 18) {
            if (violacoesStr.includes('física') || violacoesStr.includes('psicológica')) incChild(stats.bloco1.c1_violencia_intrafamiliar)
            if (violacoesStr.includes('abuso sexual')) incChild(stats.bloco1.c2_abuso_sexual)
            if (violacoesStr.includes('exploração sexual')) incChild(stats.bloco1.c3_exploracao_sexual)
            if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incChild(stats.bloco1.c4_negligencia)
            
            // C.5 - Trabalho Infantil (0-12, 13-15)
            if (violacoesStr.includes('trabalho infantil')) {
              stats.bloco1.c5_trabalho_infantil.total++
              if (age <= 12) stats.bloco1.c5_trabalho_infantil[sex].a0_12++
              else if (age <= 15) stats.bloco1.c5_trabalho_infantil[sex].a13_15++
            }
          }

          // D - Idosos (60+)
          if (age >= 60) {
            if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) stats.bloco1.d1_fisica_psico++
            if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) stats.bloco1.d2_negligencia++
          }

          // E - PCD (Qualquer idade)
          if (c.categoria === 'PCD' || c.categoria?.includes('Deficiência')) {
            if (violacoesStr.includes('física') || violacoesStr.includes('psicológica')) incStandard(stats.bloco1.e1_intrafamiliar)
            if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incStandard(stats.bloco1.e2_negligencia)
          }

          // F - Mulheres (18-59)
          if (sex === 'feminino' && age >= 18 && age <= 59) {
            if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) stats.bloco1.f1_violencia++
          }

          // G - Tráfico
          if (violacoesStr.includes('tráfico')) incStandard(stats.bloco1.g1_trafico)

          // H - Discriminação
          if (violacoesStr.includes('discriminação') || violacoesStr.includes('lgbt')) stats.bloco1.h1_discriminacao++

          // I - Pop Rua
          if (violacoesStr.includes('rua') || c.categoria?.includes('Rua')) incStandard(stats.bloco1.i1_rua)
        }

        // --- M.3 Encaminhamentos (Bloco II) ---
        // Conta encaminhamentos feitos neste mês para CRAS
        if (c.encaminhamentos && c.encaminhamentos.length > 0) {
           const crasCount = c.encaminhamentos.filter((e: any) => e.instituicao && e.instituicao.toLowerCase().includes('cras')).length
           stats.bloco2.m3_encaminhamentos_cras += crasCount
        }
      })

      // --- PROCESSAMENTO BLOCO II (Agendamentos) ---
      appointments.forEach(apt => {
        const tipo = apt.tipo ? apt.tipo.toLowerCase() : ''
        if (tipo.includes('visita') || tipo.includes('domiciliar')) {
          stats.bloco2.m4_visitas++
        } else {
          // Assume-se que o restante são atendimentos individualizados (exceto se for grupo, mas grupo pegamos de outra tabela)
          stats.bloco2.m1_individualizados++
        }
      })

      return reply.send(stats)

    } catch (error) {
      console.error('[RMA ERROR]', error)
      return reply.status(500).send({ 
        message: 'Erro ao processar relatório RMA.', 
        details: String(error) 
      })
    }
  })
}