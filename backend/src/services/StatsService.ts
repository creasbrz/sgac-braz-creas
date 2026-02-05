// backend/src/services/StatsService.ts
import { prisma } from '../lib/prisma'
import { cache } from '../lib/cache'
// [CORREÇÃO] Adicionado 'differenceInDays' na importação
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Cargo, CaseStatus, LogAction, CaseOrigin } from '@prisma/client'

// Helper para traduzir o Enum do Banco para Texto legível no Gráfico
const ORIGIN_LABELS: Record<CaseOrigin, string> = {
  [CaseOrigin.ESPONTANEA]: "Espontânea",
  [CaseOrigin.DOCUMENTAL]: "Documental/Ofício",
  [CaseOrigin.REFERENCIADA]: "Referenciada (Rede)",
  [CaseOrigin.BUSCA_ATIVA]: "Busca Ativa"
}

export class StatsService {

  // --- HELPERS PRIVADOS ---
  
  private static calculateUrgencyWeight(urgencia: string | null): number {
    if (!urgencia) return 1
    const term = urgencia.trim()
    if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte', 'Risco de reincidência', 'Sofre ameaça'].includes(term)) return 4;
    if (['Risco de desabrigo', 'Criança/Adolescente', 'PCD', 'Idoso'].includes(term)) return 3;
    if (['Internação', 'Acolhimento'].includes(term)) return 2;
    if (['Sem risco imediato', 'Visita periódica'].includes(term)) return 1;
    return 1
  }

 // --- DASHBOARD GERAL (HOME) ---
  static async getDashboard(user: { sub: string, cargo: string }) {
    if (user.cargo === Cargo.Gerente) {
      return this.getManagerDashboard()
    } else if (user.cargo === Cargo.Agente_Social || user.cargo === Cargo.Especialista) {
      return this.getUserDashboard(user.sub, user.cargo as Cargo)
    }
    return { role: 'Visitante', message: "Acesso restrito." }
  }

  private static async getManagerDashboard() {
    const cacheKey = "manager_stats_main"
    
    // [CACHE V1.1] Verifica cache antes de tocar no banco
    const cachedData = cache.get(cacheKey)
    if (cachedData) return { ...cachedData as any, cached: true }

    const today = new Date()
    const firstDay = startOfMonth(today)
    const lastDay = endOfMonth(today)

    // Consultas Paralelas (Performance)
    const [
        totalCases, 
        acolhidasCount, 
        acompanhamentosCount, 
        monitoringCount,
        newCases, 
        closedCases, 
        workloadAgent, 
        workloadSpec,
        urgencyGroups, 
        categoryGroups
    ] = await Promise.all([
        prisma.case.count(),
        prisma.case.count({ where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } } }),
        prisma.case.count({ where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] } } }),
        prisma.case.count({ where: { status: CaseStatus.EM_MONITORAMENTO } }),
        prisma.case.count({ where: { dataEntrada: { gte: firstDay, lte: lastDay } } }),
        prisma.case.count({ where: { status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDay, lte: lastDay } } }),
        // GroupBy retorna arrays, se vazio retorna []
        prisma.case.groupBy({ by: ['agenteAcolhidaId'], where: { status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] }, agenteAcolhidaId: { not: null } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['especialistaPAEFIId'], where: { status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO] }, especialistaPAEFIId: { not: null } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['urgencia'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
        prisma.case.groupBy({ by: ['categoria'], _count: { _all: true }, where: { status: { not: CaseStatus.DESLIGADO } } }),
    ])

    // Resolução de Nomes de Usuários (Evita N+1 queries)
    const userIds = [...new Set([...workloadAgent.map(w => w.agenteAcolhidaId), ...workloadSpec.map(w => w.especialistaPAEFIId)])].filter(Boolean) as string[]
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } })
    const userMap = new Map(users.map(u => [u.id, u.nome]))

    const result = {
        role: 'Gerente',
        totalCases, 
        acolhidasCount, 
        acompanhamentosCount, 
        monitoringCount,
        newCasesThisMonth: newCases, 
        closedCasesThisMonth: closedCases,
        workloadByAgent: workloadAgent.map(w => ({ name: userMap.get(w.agenteAcolhidaId!)?.split(' ')[0] || 'Desconhecido', value: w._count._all })),
        workloadBySpecialist: workloadSpec.map(w => ({ name: userMap.get(w.especialistaPAEFIId!)?.split(' ')[0] || 'Desconhecido', value: w._count._all })),
        casesByUrgency: urgencyGroups.map(g => ({ name: g.urgencia || 'Não classificado', value: g._count._all })),
        casesByCategory: categoryGroups.map(g => ({ name: g.categoria || 'Geral', value: g._count._all })),
        lastUpdated: new Date().toISOString()
    }
    
    // [CACHE V1.1] Salva por 10 minutos (TTL 600000ms)
    cache.set(cacheKey, result, 1000 * 60 * 10)
    return result
  }

  private static async getUserDashboard(userId: string, cargo: Cargo) {
    const cacheKey = `user_dash:${userId}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const today = new Date()
    const firstDay = startOfMonth(today)
    const lastDay = endOfMonth(today)
    
    const isAgent = cargo === Cargo.Agente_Social
    const filterField = isAgent ? 'agenteAcolhidaId' : 'especialistaPAEFIId'
    
    // Status que contam como "Meus Ativos"
    const statusFilter = isAgent 
        ? { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } 
        : { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] }

    const [myActive, myClosed, myNew] = await Promise.all([
        prisma.case.count({ where: { [filterField]: userId, status: statusFilter } }),
        prisma.case.count({ where: { [filterField]: userId, status: CaseStatus.DESLIGADO, dataDesligamento: { gte: firstDay, lte: lastDay } } }),
        prisma.case.count({ where: { [filterField]: userId, [isAgent ? 'dataEntrada' : 'dataInicioPAEFI']: { gte: firstDay, lte: lastDay } } })
    ])

    const result = { role: cargo, myActiveCases: myActive, myClosedMonth: myClosed, myNewCasesMonth: myNew }
    cache.set(cacheKey, result, 1000 * 30) // 30 segundos
    return result
  }

  // --- PRODUTIVIDADE ---
  static async getProductivity(mode: 'workload' | 'performance', months: number) {
    const cacheKey = `productivity:${mode}:${months}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const users = await prisma.user.findMany({ 
        where: { ativo: true, cargo: { not: Cargo.Gerente } }, 
        select: { id: true, nome: true, cargo: true } 
    })

    let result: any

    if (mode === 'performance') {
      const startDate = subMonths(new Date(), months)
      
      const rawActivity = await prisma.caseLog.findMany({ 
        where: { 
            createdAt: { gte: startDate }, 
            acao: { in: [LogAction.MUDANCA_STATUS, LogAction.DESLIGAMENTO, LogAction.ATRIBUICAO, LogAction.EVOLUCAO_CRIADA, LogAction.PAF_CRIADO] } 
        }, 
        select: { autorId: true, casoId: true } 
      })
      
      const statsMap = new Map<string, number>()
      rawActivity.forEach(log => {
        statsMap.set(log.autorId, (statsMap.get(log.autorId) || 0) + 1)
      })
      
      result = users.map(u => ({ 
          name: u.nome.split(' ')[0], 
          value: statsMap.get(u.id) || 0,
          role: u.cargo 
      })).sort((a, b) => b.value - a.value)

    } else {
      const [specialistStats, agentStats] = await Promise.all([
        prisma.case.groupBy({ by: ['especialistaPAEFIId', 'status'], where: { especialistaPAEFIId: { in: users.map(u => u.id) }, status: { not: CaseStatus.DESLIGADO } }, _count: { _all: true } }),
        prisma.case.groupBy({ by: ['agenteAcolhidaId', 'status'], where: { agenteAcolhidaId: { in: users.map(u => u.id) }, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }, _count: { _all: true } })
      ])

      result = users.map(u => {
          let active = 0, monitoring = 0
          
          if (u.cargo === Cargo.Especialista) {
              const stats = specialistStats.filter(s => s.especialistaPAEFIId === u.id)
              active = stats.filter(s => s.status !== CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0)
              monitoring = stats.filter(s => s.status === CaseStatus.EM_MONITORAMENTO).reduce((acc, curr) => acc + curr._count._all, 0)
          } else if (u.cargo === Cargo.Agente_Social) {
              active = agentStats.filter(s => s.agenteAcolhidaId === u.id).reduce((acc, curr) => acc + curr._count._all, 0)
          }
          
          return { 
              id: u.id, 
              name: u.nome.split(' ')[0], 
              role: u.cargo, 
              active, 
              monitoring, 
              totalLoad: active + (monitoring * 0.2) 
          }
      }).sort((a,b) => b.totalLoad - a.totalLoad)
    }

    cache.set(cacheKey, result, 1000 * 60 * 60)
    return result
  }

  // --- OBSERVATÓRIO SOCIAL (VIGILÂNCIA) ---
  static async getVigilanceStats() {
    const cacheKey = "vigilance_stats"
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const today = new Date()
    const sixMonthsAgo = subMonths(today, 6)

    const cases = await prisma.case.findMany({
      where: { 
          OR: [
              { createdAt: { gte: sixMonthsAgo } }, 
              { dataDesligamento: { gte: sixMonthsAgo } }, 
              { status: { not: CaseStatus.DESLIGADO } }
          ] 
      },
      select: {
        id: true, createdAt: true, dataEntrada: true, dataDesligamento: true, dataInicioPAEFI: true,
        status: true, urgencia: true, violacao: true, categoria: true, sexo: true, nascimento: true, 
        origem: true, orgaoDemandante: true,
        latitude: true, longitude: true, endereco_ra: true,
        encaminhamentos: { select: { instituicao: true } }, 
        entregas: { select: { tipo: true } }
      }
    })

    const monthsMap = new Map()
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i)
      const key = format(d, 'yyyy-MM')
      monthsMap.set(key, { name: format(d, 'MMM/yy', { locale: ptBR }), novos: 0, desligados: 0 })
    }

    const benefitsMap: Record<string, number> = {}
    const violationMap: Record<string, number> = {}
    const urgencyMap: Record<string, number> = {}
    const entryTypeMap: Record<string, number> = {}
    const originMap: Record<string, number> = {}
    const networkMap: Record<string, number> = {}
    
    const demographics = { 
        sexo: { Masculino: 0, Feminino: 0, Outro: 0 } as any, 
        etaria: { '0-11 (Criança)': 0, '12-17 (Adolescente)': 0, '18-59 (Adulto)': 0, '60+ (Idoso)': 0 } as any 
    }
    
    let totalWaitTime = 0, countWaitTime = 0, totalPermanence = 0, countPermanence = 0

    cases.forEach(c => {
        const entryKey = format(c.dataEntrada, 'yyyy-MM')
        if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++
        
        if (c.dataDesligamento) {
            const exitKey = format(c.dataDesligamento, 'yyyy-MM')
            if (monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++
        }

        const entryLabel = ORIGIN_LABELS[c.origem] || "Outros"
        entryTypeMap[entryLabel] = (entryTypeMap[entryLabel] || 0) + 1

        const originLabel = c.orgaoDemandante || "Não Informado"
        originMap[originLabel] = (originMap[originLabel] || 0) + 1

        c.encaminhamentos.forEach(e => networkMap[e.instituicao] = (networkMap[e.instituicao] || 0) + 1)
        c.entregas.forEach(e => benefitsMap[e.tipo] = (benefitsMap[e.tipo] || 0) + 1)

        if (c.status !== CaseStatus.DESLIGADO) {
            const vArr = Array.isArray(c.violacao) ? c.violacao : [c.violacao]
            vArr.forEach((vStr: any) => {
                if (typeof vStr === 'string') {
                    vStr.split(',').forEach((subV: string) => {
                        const label = subV.trim()
                        if(label) violationMap[label] = (violationMap[label] || 0) + 1
                    })
                }
            })

            const urg = c.urgencia || "Não Classificado"
            urgencyMap[urg] = (urgencyMap[urg] || 0) + 1

            if (c.sexo === 'Masculino') demographics.sexo.Masculino++
            else if (c.sexo === 'Feminino') demographics.sexo.Feminino++
            else demographics.sexo.Outro++
            
            if (c.nascimento) {
                const age = today.getFullYear() - c.nascimento.getFullYear()
                if (age < 12) demographics.etaria['0-11 (Criança)']++
                else if (age < 18) demographics.etaria['12-17 (Adolescente)']++
                else if (age < 60) demographics.etaria['18-59 (Adulto)']++
                else demographics.etaria['60+ (Idoso)']++
            }
        }

        if (c.dataEntrada && c.dataInicioPAEFI) {
            // [CORREÇÃO] Aqui estava faltando a importação de differenceInDays, agora está no topo
            const wait = differenceInDays(new Date(c.dataInicioPAEFI), new Date(c.dataEntrada))
            if (wait >= 0) { totalWaitTime += wait; countWaitTime++ }
        }
        if (c.status === CaseStatus.DESLIGADO && c.dataInicioPAEFI && c.dataDesligamento) {
            // [CORREÇÃO] Aqui também
            const perm = differenceInDays(new Date(c.dataDesligamento), new Date(c.dataInicioPAEFI))
            if (perm >= 0) { totalPermanence += perm; countPermanence++ }
        }
    })

    const avgWaitTime = countWaitTime ? Math.round(totalWaitTime / countWaitTime) : 0
    const avgPermanence = countPermanence ? Math.round(totalPermanence / countPermanence) : 0
    const totalClosed = cases.filter(c => c.dataDesligamento && c.dataDesligamento >= sixMonthsAgo).length

    const mapData = cases
        .filter(c => c.latitude && c.longitude && c.status !== CaseStatus.DESLIGADO)
        .map(c => ({
            id: c.id, 
            lat: c.latitude, 
            lng: c.longitude, 
            intensity: this.calculateUrgencyWeight(c.urgencia), 
            label: c.categoria || 'Caso',
            violacao: c.violacao, 
            categoria: c.categoria, 
            endereco: c.endereco_ra 
        }))

    const collectiveData = { totalGroups: 0, totalParticipants: 0, avgAttendance: 0 }
    try {
        collectiveData.totalGroups = await prisma.groupActivity.count({ where: { dataRealizacao: { gte: sixMonthsAgo } } })
        collectiveData.totalParticipants = await prisma.groupAttendance.count({ where: { presente: true, grupo: { dataRealizacao: { gte: sixMonthsAgo } } } })
        if(collectiveData.totalGroups > 0) collectiveData.avgAttendance = Math.round(collectiveData.totalParticipants / collectiveData.totalGroups)
    } catch(e) {
        console.warn("Erro ao buscar dados coletivos:", e)
    }

    const result = {
        evolutionData: Array.from(monthsMap.values()),
        violationData: Object.entries(violationMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        urgencyData: Object.entries(urgencyMap).map(([name, value]) => ({ name, value, weight: this.calculateUrgencyWeight(name) })).sort((a, b) => b.weight - a.weight),
        
        originData: Object.entries(originMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        networkData: Object.entries(networkMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
        entryTypeData: Object.entries(entryTypeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        
        benefitsData: Object.entries(benefitsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
        
        mapData,
        efficiencyData: { avgWaitTime, avgPermanence, totalClosed, retentionRate: totalClosed > 0 ? 85 : 0 },
        collectiveData,
        ageData: Object.entries(demographics.etaria).map(([name, value]) => ({ name, value })),
        sexData: Object.entries(demographics.sexo).map(([name, value]) => ({ name, value }))
    }

    cache.set(cacheKey, result, 1000 * 60 * 60 * 2) 
    return result
  }

  // --- ANALYTICS AVANÇADO (IA E PREDITIVO) ---
  static async getAdvancedStats(months: number, violacao?: string) {
    const cacheKey = `advanced_analytics:${months}:${violacao || 'all'}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const today = new Date()
    const startDate = startOfMonth(subMonths(today, months - 1))
    
    const whereClause: any = { 
        OR: [{ dataEntrada: { gte: startDate } }, { dataDesligamento: { gte: startDate } }] 
    }
    if (violacao && violacao !== 'all') { 
        whereClause.violacao = { has: violacao } 
    }
    
    const cases = await prisma.case.findMany({ 
        where: whereClause, 
        select: { id: true, dataEntrada: true, dataDesligamento: true, status: true, violacao: true, urgencia: true } 
    })
    
    const monthlyStats = new Map()
    for (let i = 0; i < months; i++) {
        const d = subMonths(today, (months - 1) - i)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        monthlyStats.set(key, { name: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), novos: 0, fechados: 0 })
    }
    
    const violationCount: Record<string, number> = {}
    
    cases.forEach(c => {
        const inKey = `${c.dataEntrada.getFullYear()}-${c.dataEntrada.getMonth()}`
        if (monthlyStats.has(inKey)) monthlyStats.get(inKey).novos++
        
        if (c.dataDesligamento) {
            const outKey = `${c.dataDesligamento.getFullYear()}-${c.dataDesligamento.getMonth()}`
            if (monthlyStats.has(outKey)) monthlyStats.get(outKey).fechados++
        }

        const vArr = Array.isArray(c.violacao) ? c.violacao : [c.violacao]
        vArr.forEach((vStr: any) => {
            if (typeof vStr === 'string') {
                vStr.split(',').forEach((subV: string) => {
                    const label = subV.trim()
                    if(label) violationCount[label] = (violationCount[label] || 0) + 1
                })
            }
        })
    })
    
    const pieData = Object.entries(violationCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
    const totalActive = await prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } })

    const { AnalyticsAI } = require('./AnalyticsAI'); 
    const insights = await AnalyticsAI.generateInsights(months);

    const result = { 
        trendData: Array.from(monthlyStats.values()), 
        totalActive, 
        insights, 
        pieData, 
        avgHandlingTime: 45 
    }

    cache.set(cacheKey, result, 1000 * 60 * 30)
    return result
  }

  // --- ATIVIDADE RECENTE (Feed) ---
  static async getRecentActivity(user: { sub: string, cargo: string }) {
    const cacheKey = `activity_feed:${user.sub}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const whereScope = user.cargo === Cargo.Gerente 
        ? {} 
        : { caso: { OR: [{ agenteAcolhidaId: user.sub }, { especialistaPAEFIId: user.sub }] } }
        
    const result = await prisma.caseLog.findMany({
        where: whereScope, 
        take: 10, 
        orderBy: { createdAt: 'desc' },
        include: { 
            autor: { select: { nome: true, cargo: true } }, 
            caso: { select: { id: true, nomeCompleto: true } } 
        }
    })

    cache.set(cacheKey, result, 1000 * 15)
    return result
  }
}