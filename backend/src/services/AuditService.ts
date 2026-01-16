// backend/src/services/AuditService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export interface AuditFilters {
  page: number
  pageSize: number
  search?: string
  autorId?: string
  acao?: LogAction
  periodo: 'hoje' | '7dias' | '30dias' | 'todo'
}

export class AuditService {
  
  /**
   * Listagem Avançada de Logs com Filtros
   */
  static async listLogs(filters: AuditFilters) {
    const { page, pageSize, search, autorId, acao, periodo } = filters

    // 1. Construção Dinâmica do WHERE
    const where: any = {}

    // Filtro de Texto (Busca em múltiplos campos)
    if (search) {
      where.OR = [
        { descricao: { contains: search, mode: 'insensitive' } },
        { autor: { nome: { contains: search, mode: 'insensitive' } } },
        { caso: { nomeCompleto: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Filtros Específicos
    if (autorId && autorId !== 'all') where.autorId = autorId
    if (acao) where.acao = acao

    // Filtro de Data
    const hoje = new Date()
    if (periodo === 'hoje') {
      where.createdAt = { gte: startOfDay(hoje), lte: endOfDay(hoje) }
    } else if (periodo === '7dias') {
      where.createdAt = { gte: startOfDay(subDays(hoje, 7)) }
    } else if (periodo === '30dias') {
      where.createdAt = { gte: startOfDay(subDays(hoje, 30)) }
    }

    // 2. Execução Otimizada (Count + Data)
    const [total, items] = await Promise.all([
      prisma.caseLog.count({ where }),
      prisma.caseLog.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        // Select magro para economizar banda
        select: {
          id: true,
          acao: true,
          descricao: true,
          createdAt: true,
          valorAnterior: true,
          valorNovo: true,
          autor: { 
            select: { nome: true, cargo: true, email: true } 
          },
          caso: { 
            select: { id: true, nomeCompleto: true } 
          }
        }
      })
    ])

    return { total, items }
  }

  /**
   * Estatísticas Rápidas do Dia
   */
  static async getDailyStats() {
    const todayStart = startOfDay(new Date())
    
    return prisma.caseLog.groupBy({
      by: ['acao'],
      where: {
        createdAt: { gte: todayStart }
      },
      _count: {
        _all: true
      }
    })
  }
}