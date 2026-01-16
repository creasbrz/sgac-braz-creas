// backend/src/services/AnalyticsAI.ts
import { prisma } from '../lib/prisma'
import { subMonths, startOfMonth, subDays } from 'date-fns'
import { CaseStatus } from '@prisma/client'

export interface Insight {
  type: 'success' | 'warning' | 'info'
  title: string
  description: string
}

export class AnalyticsAI {
  
  /**
   * Gera insights automáticos baseados em análise estatística dos dados.
   * Utiliza janelas de tempo móveis para detectar tendências.
   */
  static async generateInsights(monthsToCheck = 3): Promise<Insight[]> {
    const insights: Insight[] = []
    const today = new Date()
    const currentMonthStart = startOfMonth(today)
    const lastMonthStart = startOfMonth(subMonths(today, 1))

    // 1. TENDÊNCIA DE DEMANDA (Comparativo Mês Atual vs Mês Anterior)
    // Execução paralela para otimizar tempo de resposta do endpoint
    const [currentMonthCases, lastMonthCases] = await Promise.all([
      prisma.case.count({ where: { dataEntrada: { gte: currentMonthStart } } }),
      prisma.case.count({ where: { dataEntrada: { gte: lastMonthStart, lt: currentMonthStart } } })
    ])

    if (lastMonthCases > 0) {
      const growth = ((currentMonthCases - lastMonthCases) / lastMonthCases) * 100
      
      if (growth > 20) {
        insights.push({
          type: 'warning',
          title: 'Alerta de Demanda',
          description: `Aumento súbito de ${growth.toFixed(0)}% na entrada de novos casos em relação ao mês anterior.`
        })
      } else if (growth < -20) {
        insights.push({
          type: 'info',
          title: 'Queda na Demanda',
          description: `Houve uma redução de ${Math.abs(growth).toFixed(0)}% nos atendimentos iniciados este mês.`
        })
      }
    }

    // 2. RISCO DE ABANDONO (Casos sem Evolução > 30 dias)
    // Verifica casos ativos que não possuem nenhuma evolução registrada no último mês
    const stalledCases = await prisma.case.count({
      where: {
        status: { not: CaseStatus.DESLIGADO },
        evolucoes: {
          none: {
            createdAt: { gte: subDays(today, 30) }
          }
        }
      }
    })

    if (stalledCases > 0) {
      insights.push({
        type: 'warning',
        title: 'Risco de Negligência',
        description: `Detectados ${stalledCases} casos ativos sem nenhuma evolução técnica registrada há mais de 30 dias.`
      })
    } else {
      insights.push({
        type: 'success',
        title: 'Cobertura Total',
        description: 'Todos os casos ativos receberam atendimento técnico nos últimos 30 dias.'
      })
    }

    // 3. PADRÃO DE VIOLAÇÃO (Moda Estatística)
    // Agrupa pela combinação exata de violações no array
    const topViolations = await prisma.case.groupBy({
      by: ['violacao'],
      where: { 
        dataEntrada: { gte: subMonths(today, monthsToCheck) } 
      },
      _count: { violacao: true },
      orderBy: { _count: { violacao: 'desc' } },
      take: 1
    })

    if (topViolations.length > 0) {
      const top = topViolations[0]
      // Como 'violacao' é String[], unimos para exibição amigável
      const violacaoLabel = Array.isArray(top.violacao) 
        ? top.violacao.join(', ') 
        : String(top.violacao)

      insights.push({
        type: 'info',
        title: 'Padrão de Violação',
        description: `A tipologia "${violacaoLabel}" representa a maior incidência do período (${top._count.violacao} casos).`
      })
    }

    // 4. ÍNDICE DE BUSCA ATIVA
    // Analisa proatividade da equipe baseada em registros de agenda
    const visitsCount = await prisma.agendamento.count({
      where: {
        data: { gte: subMonths(today, 1) },
        OR: [
          { titulo: { contains: 'Visita', mode: 'insensitive' } },
          { titulo: { contains: 'Busca', mode: 'insensitive' } },
        ]
      }
    })

    if (visitsCount > 5) {
      insights.push({
        type: 'success',
        title: 'Território Ativo',
        description: `Equipe realizou ${visitsCount} visitas/buscas ativas no último mês.`
      })
    }

    // Ordenação por Prioridade (Warning > Success > Info)
    const priorityMap = { warning: 0, success: 1, info: 2 }
    
    return insights.sort((a, b) => {
      return priorityMap[a.type] - priorityMap[b.type]
    }).slice(0, 3) // Retorna apenas os top 3 insights
  }
}