// ARQUIVO: backend/src/services/AnalyticsAI.ts
import { prisma } from '../lib/prisma' // Ajuste o import conforme sua estrutura
import { subMonths, startOfMonth, subDays } from 'date-fns'

export interface Insight {
  type: 'success' | 'warning' | 'info'
  title: string
  description: string
}

export class AnalyticsAI {
  
  /**
   * Gera insights baseados em análise estatística dos dados reais do CREAS
   */
  static async generateInsights(monthsToCheck = 3): Promise<Insight[]> {
    const insights: Insight[] = []
    const today = new Date()
    const currentMonthStart = startOfMonth(today)
    const lastMonthStart = startOfMonth(subMonths(today, 1))

    // =================================================================
    // 1. ANÁLISE DE TENDÊNCIA DE DEMANDA (Crescimento de Casos)
    // =================================================================
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

    // =================================================================
    // 2. ANÁLISE DE RISCO DE ABANDONO (Casos sem Evolução)
    // =================================================================
    // Busca casos ativos (não desligados) que não tiveram evolução nos últimos 30 dias
    const stalledCases = await prisma.case.count({
      where: {
        status: { not: 'DESLIGADO' },
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

    // =================================================================
    // 3. PADRÃO DE VIOLAÇÃO (A mais frequente)
    // =================================================================
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
      insights.push({
        type: 'info',
        title: 'Padrão de Violação',
        description: `A violação "${top.violacao}" representa a maior incidência do período (${top._count.violacao} casos).`
      })
    }

    // =================================================================
    // 4. ÍNDICE DE BUSCA ATIVA (Visitas Domiciliares)
    // =================================================================
    const visitsCount = await prisma.agendamento.count({
      where: {
        data: { gte: subMonths(today, 1) },
        // Procura por termos comuns de visita no título ou observação
        OR: [
          { titulo: { contains: 'Visita', mode: 'insensitive' } },
          { titulo: { contains: 'Busca', mode: 'insensitive' } },
          { tipo: { contains: 'Visita', mode: 'insensitive' } } // Se houver campo tipo string
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

    // Retorna os top 3 insights mais importantes (Prioriza Warning > Success > Info)
    return insights.sort((a, b) => {
      const priority = { warning: 0, success: 1, info: 2 }
      return priority[a.type] - priority[b.type]
    }).slice(0, 3)
  }
}