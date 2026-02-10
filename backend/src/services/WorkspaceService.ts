// backend/src/services/WorkspaceService.ts
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus, LogAction } from '@prisma/client'
import { startOfDay, endOfDay, differenceInDays } from 'date-fns'

enum CaseAlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',
  PAF_STALLED = 'PAF_STALLED', 
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE', 
  RECEPTION_DELAY = 'RECEPTION_DELAY', 
  NOT_STARTED_YET = 'NOT_STARTED_YET' 
}

export class WorkspaceService {

  // --- HELPERS ---

  private static processTopViolations(violationArrays: (string[] | null)[]) {
  const counts: Record<string, number> = {}
  violationArrays.forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(rawItem => {
        if (!rawItem) return
        String(rawItem).split(',').forEach(p => {
            const name = p.trim()
            if (name) counts[name] = (counts[name] || 0) + 1
        })
      })
    }
  })
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // <--- [ALTERADO] De 5 para 10
}

  // --- MÉTODOS DE NEGÓCIO ---

  static async getAppointments(userId: string, isAuditor: boolean) {
    if (isAuditor) return []
    const now = new Date()
    return prisma.agendamento.findMany({
      where: { 
        responsavelId: userId, 
        data: { gte: startOfDay(now), lte: endOfDay(now) } 
      },
      include: { caso: { select: { id: true, nomeCompleto: true } } },
      orderBy: { data: 'asc' }
    })
  }

  static async getManagerDashboard() {
    const [totalActive, waitingForReception, waitingForDistribution, allViolations] = await Promise.all([
      prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } }),
      prisma.case.count({ where: { status: CaseStatus.AGUARDANDO_ACOLHIDA } }),
      prisma.case.count({ where: { status: CaseStatus.AGUARDANDO_DISTRIBUICAO } }),
      prisma.case.findMany({ 
        where: { status: { not: CaseStatus.DESLIGADO } },
        select: { violacao: true } 
      })
    ])
    
    const teamMembers = await prisma.user.findMany({
      where: { cargo: { in: [Cargo.Especialista, Cargo.Agente_Social] }, ativo: true },
      select: { id: true, nome: true, cargo: true }
    })

    const teamLoad = await Promise.all(teamMembers.map(async (member) => {
      let count = 0
      if (member.cargo === Cargo.Agente_Social) {
        count = await prisma.case.count({
          where: { agenteAcolhidaId: member.id, status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } }
        })
      } else {
        count = await prisma.case.count({
          where: { especialistaPAEFIId: member.id, status: { not: CaseStatus.DESLIGADO } }
        })
      }
      return { id: member.id, nome: member.nome, role: member.cargo, cases: count }
    }))

    return {
      role: 'GERENTE',
      stats: { totalActive, waitingForReception, waitingForDistribution },
      teamLoad,
      topViolations: this.processTopViolations(allViolations.map(c => c.violacao))
    }
  }

  static async getAuditorDashboard() {
    const incompleteCases = await prisma.case.findMany({
      where: { 
        status: { not: CaseStatus.DESLIGADO },
        OR: [ 
            { endereco_logradouro: null }, 
            { endereco_logradouro: '' } 
        ] 
      },
      take: 20,
      select: { id: true, nomeCompleto: true, cpf: true, endereco_logradouro: true }
    })

    const recentLogs = await prisma.caseLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nome: true } } }
    })

    return { 
      role: 'AUDITOR', 
      incompleteCases, 
      recentLogs: recentLogs.map(l => ({ ...l, acao: String(l.acao) })) 
    }
  }

  static async getOperationalDashboard(userId: string, cargo: Cargo) {
    const isEspecialista = cargo === Cargo.Especialista
    const now = new Date()
    
    const myCases = await prisma.case.findMany({
      where: isEspecialista 
        ? { especialistaPAEFIId: userId, status: { not: CaseStatus.DESLIGADO } }
        : { agenteAcolhidaId: userId, status: { in: [CaseStatus.EM_ACOLHIDA, CaseStatus.AGUARDANDO_ACOLHIDA] } },
      orderBy: [ { pesoUrgencia: 'desc' }, { updatedAt: 'desc' } ],
      select: {
        id: true, nomeCompleto: true, status: true, 
        urgencia: true, violacao: true, updatedAt: true, dataEntrada: true
      }
    })

    // [CORREÇÃO] Buscar agendamentos do dia para incluir no dashboard
    const appointments = await prisma.agendamento.findMany({
      where: { 
        responsavelId: userId, 
        data: { gte: startOfDay(now), lte: endOfDay(now) } 
      },
      include: { caso: { select: { id: true, nomeCompleto: true } } },
      orderBy: { data: 'asc' }
    })

    let detailedStats = { monitoramento: 0, acolhidaEsp: 0, acompanhamento: 0, meusAguardando: 0, meusEmAtendimento: 0, filaGeral: 0 }

    if (isEspecialista) {
      const stats = await prisma.case.groupBy({
        by: ['status'],
        where: { especialistaPAEFIId: userId, status: { not: CaseStatus.DESLIGADO } },
        _count: { _all: true }
      })
      detailedStats.monitoramento = stats.find(s => s.status === CaseStatus.EM_MONITORAMENTO)?._count._all || 0
      detailedStats.acolhidaEsp = stats.find(s => s.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA)?._count._all || 0
      detailedStats.acompanhamento = stats.find(s => s.status === CaseStatus.EM_ACOMPANHAMENTO)?._count._all || 0
    } else {
      const stats = await prisma.case.groupBy({
        by: ['status'],
        where: { agenteAcolhidaId: userId },
        _count: { _all: true }
      })
      const generalQueue = await prisma.case.count({ 
        where: { status: CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null } 
      })
      detailedStats.meusAguardando = stats.find(s => s.status === CaseStatus.AGUARDANDO_ACOLHIDA)?._count._all || 0
      detailedStats.meusEmAtendimento = stats.find(s => s.status === CaseStatus.EM_ACOLHIDA)?._count._all || 0
      detailedStats.filaGeral = generalQueue
    }

    // Alertas de Prazos
    const caseIds = myCases.map(c => c.id)
    const lastEvolutions = await prisma.evolucao.findMany({
      where: { casoId: { in: caseIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['casoId'],
      select: { casoId: true, createdAt: true }
    })
    const evoMap = new Map(lastEvolutions.map(e => [e.casoId, e.createdAt]))

    const alerts = myCases.map(c => {
      const lastDate = evoMap.get(c.id)
      const dataEntrada = new Date(c.dataEntrada)
      
      if (isEspecialista) {
        if (!lastDate) return { ...c, type: CaseAlertType.PAF_NOT_STARTED, days: differenceInDays(now, dataEntrada) }
        if (differenceInDays(now, lastDate) > 90) return { ...c, type: CaseAlertType.PAF_REVIEW_OVERDUE, days: differenceInDays(now, lastDate) }
        if (differenceInDays(now, lastDate) > 30) return { ...c, type: CaseAlertType.PAF_STALLED, days: differenceInDays(now, lastDate) }
      } else {
        if (c.status === CaseStatus.AGUARDANDO_ACOLHIDA && differenceInDays(now, dataEntrada) > 2) 
          return { ...c, type: CaseAlertType.NOT_STARTED_YET, days: differenceInDays(now, dataEntrada) }
        if (c.status === CaseStatus.EM_ACOLHIDA && !lastDate && differenceInDays(now, dataEntrada) > 5) 
          return { ...c, type: CaseAlertType.RECEPTION_DELAY, days: differenceInDays(now, dataEntrada) }
      }
      return null
    }).filter((a): a is any => a !== null)

    return { 
      role: cargo, 
      myCases, 
      alerts, 
      detailedStats, 
      appointments // [CORREÇÃO] Incluído no retorno
    }
  }

  static async distributeCase(caseId: string, targetUserId: string, roleType: 'AGENTE' | 'ESPECIALISTA', managerId: string) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nome: true, cargo: true, ativo: true }
    })

    if (!targetUser || !targetUser.ativo) throw new Error('INVALID_USER')

    const dataToUpdate: any = {}
    
    if (roleType === 'AGENTE') {
      if (targetUser.cargo !== Cargo.Agente_Social) throw new Error('ROLE_MISMATCH')
      dataToUpdate.agenteAcolhidaId = targetUserId
      dataToUpdate.status = CaseStatus.AGUARDANDO_ACOLHIDA 
    } else {
      if (targetUser.cargo !== Cargo.Especialista) throw new Error('ROLE_MISMATCH')
      dataToUpdate.especialistaPAEFIId = targetUserId
      dataToUpdate.status = CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
    }

    await prisma.$transaction([
      prisma.case.update({ where: { id: caseId }, data: dataToUpdate }),
      prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: managerId,
          acao: LogAction.ATRIBUICAO,
          descricao: `Atribuído para ${targetUser.nome} (${roleType})`
        }
      })
    ])
    
    return true
  }
}