import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns'
import { CaseStatus, Cargo, LogAction } from '@prisma/client'

// --- ENUMS ---
enum CaseAlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',
  PAF_STALLED = 'PAF_STALLED', 
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE', 
  RECEPTION_DELAY = 'RECEPTION_DELAY', 
  NOT_STARTED_YET = 'NOT_STARTED_YET' 
}

// --- SCHEMAS ---

const caseSummarySchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  status: z.string(),
  urgencia: z.string(),
  violacao: z.array(z.string()).or(z.null()).transform(val => val || []), 
  updatedAt: z.date(),
  dataEntrada: z.date()
})

const appointmentSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  data: z.date(),
  tipo: z.string().optional(),
  caso: z.object({ 
    id: z.string().optional(),
    nomeCompleto: z.string() 
  }).optional().nullable()
})

const alertSchema = caseSummarySchema.extend({
  type: z.nativeEnum(CaseAlertType),
  days: z.number()
})

const teamLoadSchema = z.object({
  id: z.string(),
  nome: z.string(),
  role: z.string(),
  cases: z.number() 
})

const logSchema = z.object({
  id: z.string(),
  acao: z.string(),
  createdAt: z.date(),
  autor: z.object({ nome: z.string() }).optional()
})

const workspaceResponseSchema = z.object({
  role: z.string(),
  appointments: z.array(appointmentSchema).default([]),
  stats: z.object({
    totalActive: z.number(),
    waitingForReception: z.number(),
    waitingForDistribution: z.number()
  }).optional(),
  teamLoad: z.array(teamLoadSchema).default([]),
  topViolations: z.array(z.object({ label: z.string(), count: z.number() })).default([]),
  incompleteCases: z.array(z.object({
    id: z.string(),
    nomeCompleto: z.string(),
    cpf: z.string().nullable(),
    endereco_logradouro: z.string().nullable() 
  })).default([]),
  recentLogs: z.array(logSchema).default([]),
  myCases: z.array(caseSummarySchema).default([]),
  alerts: z.array(alertSchema).default([]),
  detailedStats: z.object({
    monitoramento: z.number().default(0),
    acolhidaEsp: z.number().default(0),
    acompanhamento: z.number().default(0),
    meusAguardando: z.number().default(0),
    meusEmAtendimento: z.number().default(0),
    filaGeral: z.number().default(0)
  }).optional()
})

// --- HELPERS ---

function processTopViolations(violationArrays: (string[] | null)[]) {
  const counts: Record<string, number> = {}

  violationArrays.forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(rawItem => {
        if (!rawItem) return
        const parts = String(rawItem).split(',')
        parts.forEach(p => {
            const name = p.trim()
            if (name) counts[name] = (counts[name] || 0) + 1
        })
      })
    }
  })

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

// --- ROTAS ---

export async function workspaceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Sessão expirada' }) }
  })

  server.get('/workspace/summary', {
    schema: {
      tags: ['Workspace'],
      summary: 'Resumo do Dashboard Pessoal',
      response: { 200: workspaceResponseSchema }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }
    
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const ninetyDaysAgo = subDays(now, 90)
    const thirtyDaysAgo = subDays(now, 30)

    try {
      // 1. Agenda
      const appointments = cargo !== Cargo.Auditor ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { id: true, nomeCompleto: true } } },
        orderBy: { data: 'asc' }
      }) : []

      // --- GERENTE ---
      if (cargo === Cargo.Gerente) {
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

        // Cálculo de carga por membro (CORRIGIDO)
        const teamLoad = await Promise.all(
          teamMembers.map(async (member) => {
            let count = 0

            if (member.cargo === Cargo.Agente_Social) {
              // [AGENTE] Conta apenas o que está na fase de ACOLHIDA (Aguardando ou Em andamento)
              count = await prisma.case.count({
                where: { 
                    agenteAcolhidaId: member.id, 
                    status: { in: [CaseStatus.AGUARDANDO_ACOLHIDA, CaseStatus.EM_ACOLHIDA] } 
                }
              })
            } else {
              // [ESPECIALISTA] Conta tudo que está sob sua responsabilidade e não foi desligado
              count = await prisma.case.count({
                where: { 
                    especialistaPAEFIId: member.id, 
                    status: { not: CaseStatus.DESLIGADO } 
                }
              })
            }

            return {
              id: member.id,
              nome: member.nome,
              role: member.cargo,
              cases: count
            }
          })
        )

        return reply.send({
          role: 'GERENTE',
          appointments: appointments.map(a => ({ ...a, tipo: a.tipo || 'Agendamento' })),
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad,
          topViolations: processTopViolations(allViolations.map(c => c.violacao))
        })
      }

      // --- AUDITOR ---
      if (cargo === Cargo.Auditor) {
        const incompleteCases = await prisma.case.findMany({
          where: { 
            status: { not: CaseStatus.DESLIGADO },
            OR: [
              { cpf: null }, { cpf: '' }, 
              { endereco_logradouro: null }, { endereco_logradouro: '' }
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

        return reply.send({ 
          role: 'AUDITOR', 
          incompleteCases, 
          recentLogs: recentLogs.map(l => ({ ...l, acao: String(l.acao) })) 
        })
      }

      // --- OPERACIONAL (Agente / Especialista) ---
      const isEspecialista = cargo === Cargo.Especialista
      
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

      let detailedStats = {
        monitoramento: 0, acolhidaEsp: 0, acompanhamento: 0,
        meusAguardando: 0, meusEmAtendimento: 0, filaGeral: 0
      }

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

      return reply.send({
        role: cargo,
        appointments: appointments.map(a => ({ ...a, tipo: a.tipo || 'Agendamento' })),
        myCases,
        alerts,
        detailedStats
      })

    } catch (error) {
      console.error('[WORKSPACE_ERROR]', error)
      return reply.status(500).send({ message: 'Erro ao processar workspace.' })
    }
  })

  // [PATCH] Distribuir Caso
  server.patch('/distribute', {
    schema: {
      tags: ['Workspace'],
      body: z.object({
        caseId: z.string().uuid(),
        targetUserId: z.string().uuid(),
        roleType: z.enum(['AGENTE', 'ESPECIALISTA'])
      })
    }
  }, async (req, reply) => {
    const { caseId, targetUserId, roleType } = req.body
    const managerId = (req.user as any).sub

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nome: true, cargo: true, ativo: true }
    })

    if (!targetUser || !targetUser.ativo) {
        return reply.status(400).send({ message: 'Usuário inválido ou inativo.' })
    }

    const dataToUpdate: any = {}
    
    if (roleType === 'AGENTE') {
      if (targetUser.cargo !== Cargo.Agente_Social) return reply.status(400).send({ message: 'Usuário não é Agente Social.' })
      dataToUpdate.agenteAcolhidaId = targetUserId
      dataToUpdate.status = CaseStatus.AGUARDANDO_ACOLHIDA 
    } else {
      if (targetUser.cargo !== Cargo.Especialista) return reply.status(400).send({ message: 'Usuário não é Especialista.' })
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

    return reply.send({ message: 'Caso distribuído com sucesso.' })
  })
}