// backend/src/routes/workspace.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays, differenceInDays, isValid } from 'date-fns'
import { CaseStatus, Cargo, LogAction } from '@prisma/client'

// --- Enums e Interfaces ---

enum CaseAlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',
  PAF_STALLED = 'PAF_STALLED', // > 30 dias sem evolução
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE', // > 90 dias
  RECEPTION_DELAY = 'RECEPTION_DELAY', // Acolhida atrasada
  NOT_STARTED_YET = 'NOT_STARTED_YET' // Atribuído mas parado
}

// --- Schemas Reutilizáveis (Swagger Safe) ---

const caseSummarySchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  status: z.string(),
  urgencia: z.string(),
  violacao: z.string().nullable(),
  updatedAt: z.date(),
  dataEntrada: z.date()
})

const appointmentSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  data: z.date(),
  caso: z.object({ nomeCompleto: z.string() }).optional()
})

const alertSchema = caseSummarySchema.extend({
  type: z.nativeEnum(CaseAlertType),
  days: z.number()
})

const teamLoadSchema = z.object({
  nome: z.string(),
  role: z.string(),
  cases: z.number()
})

// [CORREÇÃO] Schema explícito para logs (Evita erro do Swagger com z.any)
const logSchema = z.object({
  id: z.string(),
  acao: z.string(),
  createdAt: z.date(),
  autor: z.object({ nome: z.string() })
})

// Schema de Resposta Unificado
const workspaceResponseSchema = z.object({
  role: z.string(),
  
  // Comuns
  appointments: z.array(appointmentSchema).optional(),
  
  // Gerente
  stats: z.object({
    totalActive: z.number(),
    waitingForReception: z.number(),
    waitingForDistribution: z.number()
  }).optional(),
  teamLoad: z.array(teamLoadSchema).optional(),
  topViolations: z.array(z.object({ label: z.string(), count: z.number() })).optional(),
  
  // Auditor
  incompleteCases: z.array(z.object({
    id: z.string(),
    nomeCompleto: z.string(),
    cpf: z.string().nullable(),
    endereco: z.string().nullable()
  })).optional(),
  recentLogs: z.array(logSchema).optional(),

  // Operacional (Agente/Especialista)
  myCases: z.array(caseSummarySchema).optional(),
  alerts: z.array(alertSchema).optional(),
  detailedStats: z.object({
    // Especialista
    monitoramento: z.number().optional(),
    acolhidaEsp: z.number().optional(),
    acompanhamento: z.number().optional(),
    // Agente
    meusAguardando: z.number().optional(),
    meusEmAtendimento: z.number().optional(),
    filaGeral: z.number().optional()
  }).optional()
})

export async function workspaceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] RESUMO DA MESA DE TRABALHO (Dashboard)
  server.get('/workspace/summary', {
    schema: {
      tags: ['Workspace'],
      summary: 'Dados consolidados para a tela inicial (Dashboard Pessoal)',
      response: {
        200: workspaceResponseSchema
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }
    
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    const thirtyDaysAgo = subDays(new Date(), 30)
    const ninetyDaysAgo = subDays(new Date(), 90)

    try {
      // 1. Agenda do Dia (Comum a todos exceto Auditor)
      const appointments = cargo !== Cargo.Auditor ? await prisma.agendamento.findMany({
        where: { responsavelId: userId, data: { gte: todayStart, lte: todayEnd } },
        include: { caso: { select: { nomeCompleto: true } } },
        orderBy: { data: 'asc' }
      }) : []

      // --- PERFIL GERENTE ---
      if (cargo === Cargo.Gerente) {
        const [totalActive, waitingForReception, waitingForDistribution] = await Promise.all([
          prisma.case.count({ where: { status: { not: CaseStatus.DESLIGADO } } }),
          prisma.case.count({ where: { status: CaseStatus.AGUARDANDO_ACOLHIDA } }),
          // PAEFI não distribuído
          prisma.case.count({ where: { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI } })
        ])
        
        // Carga da Equipe
        const teamLoadRaw = await prisma.user.findMany({
          where: { cargo: { in: [Cargo.Especialista, Cargo.Agente_Social] }, ativo: true },
          select: {
            nome: true,
            cargo: true,
            _count: { 
              select: { 
                casosAcolhida: { 
                  where: { status: { in: [CaseStatus.EM_ACOLHIDA, CaseStatus.AGUARDANDO_ACOLHIDA] } } 
                }, 
                casosPAEFI: { 
                  where: { 
                    // [ATUALIZAÇÃO] Enum corrigido para EM_ACOMPANHAMENTO
                    status: { in: [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO, CaseStatus.EM_MONITORAMENTO] } 
                  } 
                }
              } 
            }
          }
        })

        const violationsRaw = await prisma.case.groupBy({
          by: ['violacao'],
          where: { status: { not: CaseStatus.DESLIGADO } },
          _count: { violacao: true },
          orderBy: { _count: { violacao: 'desc' } },
          take: 5
        })

        return reply.send({
          role: 'GERENTE',
          appointments,
          stats: { totalActive, waitingForReception, waitingForDistribution },
          teamLoad: teamLoadRaw.map(t => ({
            nome: t.nome,
            role: t.cargo,
            cases: (t._count?.casosAcolhida || 0) + (t._count?.casosPAEFI || 0)
          })),
          topViolations: violationsRaw
            .filter(v => v.violacao && v.violacao.trim() !== '')
            .map(v => ({ label: v.violacao, count: v._count.violacao })),
        })
      }

      // --- PERFIL AUDITOR ---
      if (cargo === Cargo.Auditor) {
        const incompleteCases = await prisma.case.findMany({
          where: { 
            status: { not: CaseStatus.DESLIGADO },
            OR: [{ cpf: null }, { cpf: '' }, { endereco: null }, { endereco: '' }] 
          },
          take: 20,
          select: { id: true, nomeCompleto: true, cpf: true, endereco: true }
        })

        const recentLogs = await prisma.caseLog.findMany({
          where: { acao: { in: [LogAction.DESLIGAMENTO, LogAction.OUTRO, LogAction.MUDANCA_STATUS] } },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { // Select explícito para bater com logSchema
            id: true,
            acao: true,
            createdAt: true,
            autor: { select: { nome: true } } 
          }
        })

        // Conversão de tipos para bater com o schema (LogAction -> string)
        const formattedLogs = recentLogs.map(log => ({
          ...log,
          acao: log.acao.toString()
        }))

        return reply.send({ role: 'AUDITOR', incompleteCases, recentLogs: formattedLogs })
      }

      // --- PERFIL OPERACIONAL (Especialista e Agente) ---
      const isEspecialista = cargo === Cargo.Especialista

      const caseFilter: any = isEspecialista 
        ? { especialistaPAEFIId: userId, status: { not: CaseStatus.DESLIGADO } }
        : { agenteAcolhidaId: userId, status: { in: [CaseStatus.EM_ACOLHIDA, CaseStatus.AGUARDANDO_ACOLHIDA] } }

      const myCases = await prisma.case.findMany({
        where: caseFilter,
        orderBy: [ { pesoUrgencia: 'desc' }, { updatedAt: 'desc' } ],
        select: {
          id: true, nomeCompleto: true, status: true, 
          urgencia: true, violacao: true, updatedAt: true, dataEntrada: true
        }
      })

      let detailedStats = {}
      
      if (isEspecialista) {
        const stats = await prisma.case.groupBy({
          by: ['status'],
          where: { especialistaPAEFIId: userId, status: { not: CaseStatus.DESLIGADO } },
          _count: { _all: true }
        })
        detailedStats = {
          monitoramento: stats.find(s => s.status === CaseStatus.EM_MONITORAMENTO)?._count._all || 0,
          acolhidaEsp: stats.find(s => s.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA)?._count._all || 0,
          // [ATUALIZAÇÃO] Enum corrigido
          acompanhamento: stats.find(s => s.status === CaseStatus.EM_ACOMPANHAMENTO)?._count._all || 0
        }
      } else {
        const stats = await prisma.case.groupBy({
          by: ['status'],
          where: { agenteAcolhidaId: userId },
          _count: { _all: true }
        })
        
        const generalQueue = await prisma.case.count({ 
          where: { status: CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null } 
        })

        detailedStats = {
          meusAguardando: stats.find(s => s.status === CaseStatus.AGUARDANDO_ACOLHIDA)?._count._all || 0,
          meusEmAtendimento: stats.find(s => s.status === CaseStatus.EM_ACOLHIDA)?._count._all || 0,
          filaGeral: generalQueue
        }
      }

      // Alertas
      const caseIds = myCases.map(c => c.id)
      let evoMap = new Map()
      
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
          if (!lastDate) return { ...c, type: CaseAlertType.PAF_NOT_STARTED, days: 0 }
          
          if (isValid(new Date(lastDate))) {
             if (lastDate < thirtyDaysAgo && lastDate >= ninetyDaysAgo) 
               return { ...c, type: CaseAlertType.PAF_STALLED, days: differenceInDays(new Date(), lastDate) }
             if (lastDate < ninetyDaysAgo) 
               return { ...c, type: CaseAlertType.PAF_REVIEW_OVERDUE, days: differenceInDays(new Date(), lastDate) }
          }
        } else {
          if (c.status === CaseStatus.AGUARDANDO_ACOLHIDA && differenceInDays(new Date(), dataEntrada) > 2) {
             return { ...c, type: CaseAlertType.NOT_STARTED_YET, days: differenceInDays(new Date(), dataEntrada) }
          }
          if (c.status === CaseStatus.EM_ACOLHIDA && !lastDate && differenceInDays(new Date(), dataEntrada) > 5) {
            return { ...c, type: CaseAlertType.RECEPTION_DELAY, days: differenceInDays(new Date(), dataEntrada) }
          }
        }
        return null
      }).filter(Boolean)

      return reply.send({
        role: cargo.toUpperCase(),
        appointments,
        myCases,
        alerts: alerts as any, // Cast simples para satisfazer o union do alertSchema
        detailedStats
      })

    } catch (error) {
      console.error('[WORKSPACE_ERROR]', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 2. [GET] CASOS NÃO DISTRIBUÍDOS (Kanban - Backlog)
  server.get('/workspace/undistributed', {
    schema: {
      tags: ['Workspace'],
      summary: 'Listar casos aguardando distribuição',
      response: {
        200: z.array(z.object({
          id: z.string(),
          nomeCompleto: z.string(),
          status: z.string(),
          urgencia: z.string(),
          dataEntrada: z.date()
        }))
      }
    }
  }, async (req, reply) => {
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          // Casos novos sem agente
          { status: CaseStatus.AGUARDANDO_ACOLHIDA, agenteAcolhidaId: null },
          // Casos PAEFI sem especialista
          { status: CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI, especialistaPAEFIId: null }
        ]
      },
      orderBy: { dataEntrada: 'asc' },
      select: {
        id: true,
        nomeCompleto: true,
        status: true,
        urgencia: true,
        dataEntrada: true
      }
    })
    return reply.send(cases)
  })

  // 3. [PATCH] DISTRIBUIR CASO
  server.patch('/workspace/distribute', {
    schema: {
      tags: ['Workspace'],
      summary: 'Atribuir caso a um técnico',
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
      dataToUpdate.status = CaseStatus.EM_ACOLHIDA
    } else {
      if (targetUser.cargo !== Cargo.Especialista) return reply.status(400).send({ message: 'Usuário não é Especialista.' })
      dataToUpdate.especialistaPAEFIId = targetUserId
      // [ATUALIZAÇÃO] Enum corrigido
      dataToUpdate.status = CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
    }

    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: dataToUpdate })
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: managerId,
          acao: LogAction.ATRIBUICAO,
          descricao: `Caso atribuído para ${targetUser.nome} (${roleType})`
        }
      })
    })

    return reply.send({ message: 'Caso distribuído com sucesso.' })
  })
}