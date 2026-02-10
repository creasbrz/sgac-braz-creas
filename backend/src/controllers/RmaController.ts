import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
import { startOfMonth, endOfMonth } from 'date-fns'
import { CaseStatus } from '@prisma/client'
import { z } from 'zod'

export class RmaController {
  
  static async getRma(req: FastifyRequest, reply: FastifyReply) {
    try {
      const querySchema = z.object({
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2020)
      })

      const { month, year } = querySchema.parse(req.query)
      const dateRef = new Date(year, month - 1, 1)
      const startDate = startOfMonth(dateRef)
      const endDate = endOfMonth(dateRef)

      // 1. Buscar DADOS BRUTOS (Para processar em memória e economizar queries)
      const [allActiveCases, newCases, evolutions, groups, referrals] = await Promise.all([
        // Casos Ativos (PAEFI)
        prisma.case.findMany({
          where: {
            status: { not: CaseStatus.DESLIGADO }, // Considera todos não desligados
            dataInicioPAEFI: { lte: endDate },
            OR: [{ dataDesligamento: null }, { dataDesligamento: { gt: endDate } }],
          },
          include: { familia: true }
        }),
        // Novos Casos no Mês
        prisma.case.count({
          where: {
            dataInicioPAEFI: { gte: startDate, lte: endDate }
          }
        }),
        // Evoluções (Atendimentos Técnicos)
        prisma.evolucao.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        // Grupos
        prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: startDate, lte: endDate } } } }),
        // Encaminhamentos
        prisma.encaminhamento.count({ where: { dataEnvio: { gte: startDate, lte: endDate } } })
      ])

      // 2. PROCESSAMENTO DE VIOLAÇÕES (Bloco III)
      // Inicializa contadores zerados
      const violacoes = {
        crianca_abuso: 0, crianca_exploracao: 0, crianca_negligencia: 0,
        adolescente_mse: 0,
        mulher_violencia: 0,
        idoso_negligencia: 0, idoso_violencia: 0,
        pcd_negligencia: 0,
        discriminacao: 0,
        outros: 0
      }

      // Itera sobre cada caso ativo para classificar
      allActiveCases.forEach(c => {
        // Normaliza as violações (pode ser array ou string)
        const vList = Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [String(c.violacao)] : [])
        const vText = vList.join(' ').toLowerCase() // Texto completo para busca

        // Lógica de classificação baseada em palavras-chave no cadastro
        if (vText.includes('sexual') || vText.includes('abuso')) violacoes.crianca_abuso++
        else if (vText.includes('trabalho') || vText.includes('exploração')) violacoes.crianca_exploracao++
        else if (vText.includes('negligência') && (vText.includes('criança') || vText.includes('adolescente'))) violacoes.crianca_negligencia++
        else if (vText.includes('mse') || vText.includes('socioeducativa')) violacoes.adolescente_mse++
        else if (vText.includes('mulher') || vText.includes('doméstica')) violacoes.mulher_violencia++
        else if (vText.includes('idoso')) violacoes.idoso_negligencia++ // Simplificação
        else if (vText.includes('pcd') || vText.includes('deficiência')) violacoes.pcd_negligencia++
        else violacoes.outros++
      })

      // 3. CÁLCULO DE TOTAIS
      const pessoasTotal = allActiveCases.reduce((acc, c) => acc + 1 + (c.familia?.length || 0), 0)

      // 4. MONTAR RESPOSTA ESTRUTURADA (RMA COMPLETO)
      const response = {
        periodo: `${month}/${year}`,
        generatedAt: new Date(),
        
        // BLOCO I - PAEFI
        bloco1: {
          a1_ativos_inicio: Math.max(0, allActiveCases.length - newCases), // Apenas estimativa
          a2_novos_inseridos: newCases,
          a3_reativados: 0, // Implementar se houver lógica de reativação
          a4_desligados: 0, // Implementar query de desligados se necessário
          a5_ativos_fim: allActiveCases.length,
          total_pessoas: pessoasTotal
        },

        // BLOCO II - ATENDIMENTOS
        bloco2: {
          b1_acolhida: 0, // Se tiver tabela separada
          b2_tecnico_individual: evolutions,
          b3_tecnico_grupo: groups,
          b4_visitas: await prisma.agendamento.count({ where: { data: { gte: startDate, lte: endDate }, titulo: { contains: 'Visita', mode: 'insensitive' } } }),
          b5_encaminhamentos: referrals
        },

        // BLOCO III - VIOLAÇÕES (O Coração do CREAS)
        bloco3: violacoes
      }

      return reply.send(response)

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar RMA', error })
    }
  }
}