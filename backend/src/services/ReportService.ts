// backend/src/services/ReportService.ts
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import { subMonths, format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export class ReportService {

  // --- Helpers Privados ---

  private static calculateUrgencyWeight(urgencia: string | null): number {
    if (!urgencia) return 1;
    const term = urgencia.trim();
    if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
    if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
    if (['PCD', 'Idoso', 'Internação', 'Acolhimento'].includes(term)) return 2;
    return 1;
  }

  // --- Métodos Públicos ---

  /**
   * Gera relatório de carga de trabalho da equipe técnica
   */
  static async getTeamOverview() {
    // 1. Busca técnicos
    const technicians = await prisma.user.findMany({
      where: {
        cargo: { in: [Cargo.Agente_Social, Cargo.Especialista] },
        ativo: true,
      },
      select: { id: true, nome: true, cargo: true },
      orderBy: { cargo: 'asc' },
    })

    // 2. Busca casos ativos
    const activeCases = await prisma.case.findMany({
      where: { status: { not: CaseStatus.DESLIGADO } },
      select: {
        id: true, 
        nomeCompleto: true, 
        status: true,
        urgencia: true,
        violacao: true, 
        agenteAcolhidaId: true, 
        especialistaPAEFIId: true,
        pesoUrgencia: true
      },
      orderBy: { pesoUrgencia: 'desc' }
    })

    // 3. Cruzamento em Memória
    return technicians.map((tech) => {
      const techCases = activeCases.filter((c) => {
        // Regra: Agente Social vê casos em Acolhida
        if (tech.cargo === Cargo.Agente_Social) {
          return (
            c.agenteAcolhidaId === tech.id && 
            (c.status === CaseStatus.AGUARDANDO_ACOLHIDA || c.status === CaseStatus.EM_ACOLHIDA)
          )
        }
        // Regra: Especialista vê casos em Acompanhamento
        if (tech.cargo === Cargo.Especialista) {
          return (
            c.especialistaPAEFIId === tech.id && 
            (c.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA || c.status === CaseStatus.EM_ACOMPANHAMENTO || c.status === CaseStatus.EM_MONITORAMENTO)
          )
        }
        return false
      })

      return {
        nome: tech.nome,
        cargo: tech.cargo === Cargo.Agente_Social ? 'Agente Social' : 'Especialista',
        cases: techCases.map(c => ({
          ...c,
          violacao: Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [c.violacao] : [])
        })), 
      }
    })
  }

  /**
   * Gera estatísticas de desligamentos/arquivamentos
   */
  static async getDismissalsReport(months: number) {
    const startDate = subMonths(new Date(), months)

    const closedCases = await prisma.case.findMany({
      where: {
        status: CaseStatus.DESLIGADO,
        dataDesligamento: { gte: startDate }
      },
      select: {
        id: true,
        nomeCompleto: true,
        motivoDesligamento: true,
        destinoDesligamento: true,
        dataDesligamento: true,
        dataInicioPAEFI: true
      }
    })

    const motivosCount: Record<string, number> = {}
    const destinosCount: Record<string, number> = {}

    const processedList = closedCases.map(c => {
      const mot = c.motivoDesligamento || 'Não informado'
      const dest = c.destinoDesligamento || 'Não informado'
      
      motivosCount[mot] = (motivosCount[mot] || 0) + 1
      destinosCount[dest] = (destinosCount[dest] || 0) + 1

      let dias = 0;
      if (c.dataInicioPAEFI && c.dataDesligamento) {
          dias = differenceInDays(c.dataDesligamento, c.dataInicioPAEFI);
      }

      return { ...c, tempoAcompanhamento: dias }
    })

    return {
      total: closedCases.length,
      byMotivo: Object.entries(motivosCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      byDestino: Object.entries(destinosCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      list: processedList.slice(0, 50)
    }
  }

  /**
   * Gera dados para o Observatório (Vigilância Socioassistencial)
   */
  static async getVigilanceStats() {
    const today = new Date()
    const sixMonthsAgo = subMonths(today, 6)

    // Busca ampla otimizada
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { createdAt: { gte: sixMonthsAgo } }, 
          { dataDesligamento: { gte: sixMonthsAgo } },
          { status: { not: CaseStatus.DESLIGADO } } 
        ]
      },
      select: {
        id: true, 
        nomeCompleto: true, 
        dataEntrada: true, 
        dataDesligamento: true,
        status: true, 
        urgencia: true, 
        violacao: true, 
        categoria: true,
        latitude: true, 
        longitude: true, 
        endereco_ra: true,
        orgaoDemandante: true
      }
    })

    // Inicializa estrutura de meses
    const monthsMap = new Map()
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i)
      const key = format(d, 'yyyy-MM')
      monthsMap.set(key, { name: format(d, 'MMM/yy', { locale: ptBR }), novos: 0, desligados: 0 })
    }
    
    const violationMap: Record<string, number> = {}
    const originMap: Record<string, number> = {}
    const mapData: any[] = []

    cases.forEach(c => {
      // 1. Evolução Temporal
      const entryKey = format(c.dataEntrada, 'yyyy-MM')
      if (monthsMap.has(entryKey)) monthsMap.get(entryKey).novos++
      
      if (c.dataDesligamento) {
        const exitKey = format(c.dataDesligamento, 'yyyy-MM')
        if (monthsMap.has(exitKey)) monthsMap.get(exitKey).desligados++
      }

      // 2. Mapa de Calor (Apenas ativos com geolocalização)
      if (c.status !== CaseStatus.DESLIGADO && c.latitude && c.longitude) {
        mapData.push({
          id: c.id, 
          lat: c.latitude, 
          lng: c.longitude, 
          intensity: this.calculateUrgencyWeight(c.urgencia),
          label: c.nomeCompleto, 
          violacao: Array.isArray(c.violacao) ? c.violacao.join(', ') : c.violacao,
          endereco: c.endereco_ra,
          categoria: c.categoria 
        })
      }

      // 3. Rede (Órgãos Demandantes)
      if (c.orgaoDemandante) {
          const org = c.orgaoDemandante.trim()
          originMap[org] = (originMap[org] || 0) + 1
      }

      // 4. Violações (Apenas ativos)
      if (c.status !== CaseStatus.DESLIGADO) {
        const violations = Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [c.violacao] : [])
        violations.forEach(v => {
            v.split(',').forEach(subV => {
                const label = subV.trim()
                if(label) violationMap[label] = (violationMap[label] || 0) + 1
            })
        })
      }
    })

    return {
      evolutionData: Array.from(monthsMap.values()),
      violationData: Object.entries(violationMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      originData: Object.entries(originMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      mapData,
      totalActive: cases.filter(c => c.status !== CaseStatus.DESLIGADO).length
    }
  }
}