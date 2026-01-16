// backend/src/routes/workspace.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { WorkspaceService } from '../services/WorkspaceService'

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
  type: z.string(),
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

export async function workspaceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Sessão expirada' }) }
  })

  // 1. [GET] Resumo do Workspace
  server.get('/workspace/summary', {
    schema: {
      tags: ['Workspace'],
      summary: 'Resumo do Dashboard Pessoal',
      response: { 200: workspaceResponseSchema }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }
    
    try {
      // Agenda Comum
      const appointments = await WorkspaceService.getAppointments(userId, cargo === Cargo.Auditor)
      const mappedAppointments = appointments.map(a => ({ ...a, tipo: a.tipo || 'Agendamento' }))

      let response: any = { role: cargo, appointments: mappedAppointments }

      if (cargo === Cargo.Gerente) {
        const managerData = await WorkspaceService.getManagerDashboard()
        response = { ...response, ...managerData }
      } 
      else if (cargo === Cargo.Auditor) {
        const auditorData = await WorkspaceService.getAuditorDashboard()
        response = { ...response, ...auditorData }
      } 
      else {
        const operationalData = await WorkspaceService.getOperationalDashboard(userId, cargo)
        response = { ...response, ...operationalData }
      }

      return reply.send(response)

    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar workspace.' })
    }
  })

  // 2. [PATCH] Distribuir Caso
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

    try {
      await WorkspaceService.distributeCase(caseId, targetUserId, roleType, managerId)
      return reply.send({ message: 'Caso distribuído com sucesso.' })
    } catch (error: any) {
      if (error.message === 'INVALID_USER') return reply.status(400).send({ message: 'Usuário inválido ou inativo.' })
      if (error.message === 'ROLE_MISMATCH') return reply.status(400).send({ message: 'Cargo do usuário não corresponde ao solicitado.' })
      throw error
    }
  })
}