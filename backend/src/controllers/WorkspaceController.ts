import { FastifyReply, FastifyRequest } from 'fastify'
import { WorkspaceService } from '../services/WorkspaceService'
import { z } from 'zod'
import { Cargo } from '@prisma/client' // Uso do Enum nativo

export class WorkspaceController {
  
  // GET /workspace/summary
  static async getSummary(req: FastifyRequest, reply: FastifyReply) {
    // A mágica acontece aqui: req.user agora é tipado!
    // Sem 'as any', sem 'try/catch'
    const { sub: userId, cargo } = req.user 

    let response = {}

    // Lógica limpa e direta
    if (cargo === Cargo.Gerente) {
      const managerData = await WorkspaceService.getManagerDashboard()
      response = { ...response, ...managerData }
    } 
    else if (cargo === Cargo.Auditor) {
      const auditorData = await WorkspaceService.getAuditorDashboard()
      response = { ...response, ...auditorData }
    } 
    else {
      // Agente ou Especialista
      const operationalData = await WorkspaceService.getOperationalDashboard(userId, cargo)
      response = { ...response, ...operationalData }
    }

    return reply.send(response)
  }

  // POST /workspace/distribute
  static async distributeCase(
    req: FastifyRequest<{ Body: { caseId: string, targetUserId: string, roleType: 'AGENTE' | 'ESPECIALISTA' } }>, 
    reply: FastifyReply
  ) {
    const { caseId, targetUserId, roleType } = req.body
    const { sub: managerId } = req.user

    // Se o Service lançar erro (ex: 'INVALID_USER'), o GlobalHandler captura.
    await WorkspaceService.distributeCase(caseId, targetUserId, roleType, managerId)
    
    return reply.send({ message: 'Caso distribuído com sucesso.' })
  }
}