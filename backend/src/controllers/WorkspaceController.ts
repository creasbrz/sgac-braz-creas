// backend/src/controllers/WorkspaceController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { WorkspaceService } from '../services/WorkspaceService'
import { Cargo } from '@prisma/client'

export class WorkspaceController {
  static async getSummary(req: FastifyRequest, reply: FastifyReply) {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }
    
    try {
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
  }

  static async distributeCase(req: FastifyRequest<{ Body: { caseId: string, targetUserId: string, roleType: 'AGENTE' | 'ESPECIALISTA' } }>, reply: FastifyReply) {
    const { caseId, targetUserId, roleType } = req.body
    const { sub: managerId } = req.user as { sub: string }

    try {
      await WorkspaceService.distributeCase(caseId, targetUserId, roleType, managerId)
      return reply.send({ message: 'Caso distribuído com sucesso.' })
    } catch (error: any) {
      if (error.message === 'INVALID_USER') return reply.status(400).send({ message: 'Usuário inválido ou inativo.' })
      if (error.message === 'ROLE_MISMATCH') return reply.status(400).send({ message: 'Cargo do usuário não corresponde ao solicitado.' })
      throw error
    }
  }
}