import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays, differenceInDays, isValid } from 'date-fns'

enum CaseAlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',
  PAF_STALLED = 'PAF_STALLED',
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE',
  RECEPTION_DELAY = 'RECEPTION_DELAY',
  NOT_STARTED_YET = 'NOT_STARTED_YET'
}

interface AuthUser {
  sub: string
  cargo: 'Agente_Social' | 'Especialista' | 'Gerente' | 'Auditor'
}

export async function workspaceRoutes(app: FastifyInstance) {

  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  app.get('/workspace/summary', async (req, reply) => {
    const { sub: userId, cargo } = req.user as AuthUser
    
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    const thirtyDaysAgo = subDays(new Date(), 30)
    const ninetyDaysAgo = subDays(new Date(), 90)

    try {
      // Agenda do Dia (Comum a todos exceto Auditor)
      const appointments = cargo !== 'Auditor' ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { nomeCompleto: true } } },
        orderBy: { data: 'asc' }
      }) : []

      // --- PERFIL GERENTE ---
      if (cargo === 'Gerente') {
        const totalActive = await prisma.case.count({ where: { status: { not: 'DESLIGADO' } } })
        
        // Filas Globais
        const waitingForReception = await prisma.case.count({ where: { status: 'AGUARDANDO_ACOLHIDA' } })
        const waitingForDistribution = await prisma.case.count({ where: { status: 'AGUARDANDO_DISTRIBUICAO_PAEFI' } })
        
        const teamLoad = await prisma.user.findMany({
          where: { cargo: { in: ['Especialista', 'Agente_Social'] }, ativo: true },
          select: {
            nome: true,
            cargo: true,
            _count: { 
              select: { 
                // Agente: Em atendimento + Atribuídos na fila
                casosAcolhida: { 
                  where: { 
                    status: { in: ['EM_ACOLHIDA', 'AGUARDANDO_ACOLHIDA'] } 
                  } 
                }, 
                // Especialista: Todo o fluxo PAEFI (inclusive fila especializada)
                casosPAEFI: { 
                  where: { 
                    status: { in: ['EM_ACOLHIDA_ESPECIALIZADA', 'EM_ACOMPANHAMENTO_PAEFI', 'EM_MONITORAMENTO'] } 
                  } 
                }
              } 
            }
          }
        })

        const violationsRaw = await prisma.case.groupBy({
          by: ['violacao'],
          where: { status: { not: 'DESLIGADO' } },
          _count: { violacao: true },
          orderBy: { _count: { violacao: 'desc' } },
          take: 5
        })

        return reply.send({
          role: 'GERENTE',
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad: teamLoad.map(t => ({
            nome: t.nome,
            role: t.cargo,
            cases: (t._count?.casosAcolhida || 0) + (t._count?.casosPAEFI || 0)
          })),
          topViolations: violationsRaw
            .filter(v => v.violacao && v.violacao.trim() !== '')
            .map(v => ({ label: v.violacao, count: v._count.violacao })),
          appointments
        })
      }

      // --- PERFIL AUDITOR ---
      if (cargo === 'Auditor') {
        const incompleteCases = await prisma.case.findMany({
          where: { 
            status: { not: 'DESLIGADO' },
            OR: [{ cpf: null }, { cpf: '' }, { endereco: null }, { endereco: '' }] 
          },
          take: 20,
          select: { id: true, nomeCompleto: true, cpf: true, endereco: true }
        })
        const recentLogs = await prisma.caseLog.findMany({
          where: { acao: { in: ['DESLIGAMENTO', 'EXCLUSAO', 'MUDANCA_STATUS'] } },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { autor: { select: { nome: true } } }
        })
        return reply.send({ role: 'AUDITOR', incompleteCases, recentLogs })
      }

      // --- PERFIL OPERACIONAL (Especialista e Agente) ---
      const isEspecialista = cargo === 'Especialista'

      // Filtro Principal
      const caseFilter = isEspecialista 
        ? { especialistaPAEFIId: userId, status: { not: 'DESLIGADO' } }
        : { agenteAcolhidaId: userId, status: { in: ['EM_ACOLHIDA', 'AGUARDANDO_ACOLHIDA'] } }

      const myCases = await prisma.case.findMany({
        where: caseFilter,
        orderBy: [
          { pesoUrgencia: 'desc' }, // [ORDENAÇÃO PEDIDA] Urgência primeiro
          { updatedAt: 'desc' }     // Depois atividade recente
        ],
        select: {
          id: true, nomeCompleto: true, status: true, 
          urgencia: true, violacao: true, updatedAt: true, dataEntrada: true
        }
      })

      // Estatísticas Detalhadas para os Cards/Abas
      let detailedStats = {}
      if (isEspecialista) {
        const stats = await prisma.case.groupBy({
          by: ['status'],
          where: { especialistaPAEFIId: userId, status: { not: 'DESLIGADO' } },
          _count: { _all: true }
        })
        detailedStats = {
          // Estes números batem com as abas do frontend
          monitoramento: stats.find(s => s.status === 'EM_MONITORAMENTO')?._count._all || 0,
          acolhidaEsp: stats.find(s => s.status === 'EM_ACOLHIDA_ESPECIALIZADA')?._count._all || 0,
          acompanhamento: stats.find(s => s.status === 'EM_ACOMPANHAMENTO_PAEFI')?._count._all || 0
        }
      } else {
        const stats = await prisma.case.groupBy({
          by: ['status'],
          where: { agenteAcolhidaId: userId },
          _count: { _all: true }
        })
        
        // Contagem da fila geral (disponível para puxar)
        const generalQueue = await prisma.case.count({ 
          where: { status: 'AGUARDANDO_ACOLHIDA', agenteAcolhidaId: null } 
        })

        detailedStats = {
          meusAguardando: stats.find(s => s.status === 'AGUARDANDO_ACOLHIDA')?._count._all || 0,
          meusEmAtendimento: stats.find(s => s.status === 'EM_ACOLHIDA')?._count._all || 0,
          filaGeral: generalQueue
        }
      }

      // Geração de Alertas
      const caseIds = myCases.map(c => c.id)
      let evoMap = new Map()
      
      // Busca última evolução de cada caso para calcular alertas
      if (caseIds.length > 0) {
        const lastEvolutions = await prisma.evolucao.findMany({
          where: { casoId: { in: caseIds } },
          orderBy: { createdAt: 'desc' },
          distinct: ['casoId'],
          select: { casoId: true, createdAt: true }
        })
        evoMap = new Map(lastEvolutions.map(e => [e.casoId, e.createdAt]))
      }

      const alerts = myCases.map(c => {
        const lastDate = evoMap.get(c.id)
        const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : new Date()
        
        if (isEspecialista) {
          // Alertas de Especialista: Foco no PAF e Prazos
          if (!lastDate) return { ...c, type: CaseAlertType.PAF_NOT_STARTED, days: 0 }
          
          if (isValid(new Date(lastDate))) {
             // Alerta Amarelo: Entre 30 e 90 dias sem evolução
             if (lastDate < thirtyDaysAgo && lastDate >= ninetyDaysAgo) 
                return { ...c, type: CaseAlertType.PAF_STALLED, days: differenceInDays(new Date(), lastDate) }
             // Alerta Vermelho: Mais de 90 dias (Revisão vencida)
             if (lastDate < ninetyDaysAgo) 
                return { ...c, type: CaseAlertType.PAF_REVIEW_OVERDUE, days: differenceInDays(new Date(), lastDate) }
          }
        } else {
          // Alertas de Agente: Foco no início do atendimento
          // Se atribuído mas não começou em 2 dias
          if (c.status === 'AGUARDANDO_ACOLHIDA' && differenceInDays(new Date(), dataEntrada) > 2) {
             return { ...c, type: CaseAlertType.NOT_STARTED_YET, days: differenceInDays(new Date(), dataEntrada) }
          }
          // Se em acolhida mas sem evolução há 5 dias
          if (c.status === 'EM_ACOLHIDA' && !lastDate && differenceInDays(new Date(), dataEntrada) > 5) {
            return { ...c, type: CaseAlertType.RECEPTION_DELAY, days: differenceInDays(new Date(), dataEntrada) }
          }
        }
        return null
      }).filter(Boolean)

      return reply.send({
        role: cargo.toUpperCase(),
        myCases,
        alerts,
        appointments,
        detailedStats
      })

    } catch (error) {
      console.error('[WORKSPACE_ERROR]', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}