// backend/src/controllers/CaseController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { CaseService } from '../services/CaseService'
import { CreateCaseInput, UpdateCaseInput } from '../schemas/caseSchema'
import { Cargo, CaseStatus } from '@prisma/client'

interface UpdateStatusBody {
  status: CaseStatus
}

interface AssignSpecialistBody {
  specialistId: string
}

interface CloseCaseBody {
  parecerFinal: string
  motivoDesligamento: string
  destinoDesligamento?: string
  manterReferencia?: boolean
}

export class CaseController {
  
  static async create(req: FastifyRequest<{ Body: CreateCaseInput & { email?: string, casoPrincipalId?: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    
    try {
      const newCase = await CaseService.create(req.body, userId)
      return reply.status(201).send(newCase)
    } catch (error: any) {
      if (error.message === 'CPF_ALREADY_EXISTS') {
        return reply.status(409).send({ message: 'CPF já cadastrado.' })
      }
      throw error
    }
  }

  static async list(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const user = req.user as { sub: string, cargo: string }
    const result = await CaseService.findAll(req.query, user)
    return reply.send(result)
  }

  static async listClosed(req: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    const user = req.user as { sub: string, cargo: string }
    
    const queryParams = req.query as Record<string, any>;

    const closedFilters = {
      ...queryParams, 
      status: 'DESLIGADO',
      view: 'all' 
    }

    const result = await CaseService.findAll(closedFilters, user)
    return reply.send(result)
  }

  static async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const caso = await CaseService.getCaseWithEconomics(id)
    
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
    return reply.send(caso)
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: UpdateCaseInput & { email?: string, casoPrincipalId?: string | null } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }
    
    try {
      const updated = await CaseService.update(id, req.body, userId)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      throw error
    }
  }

  static async updateStatus(req: FastifyRequest<{ Params: { id: string }, Body: UpdateStatusBody }>, reply: FastifyReply) {
    const { id } = req.params
    const { status } = req.body
    const { sub: userId } = req.user as { sub: string }

    try {
      const updated = await CaseService.updateStatus(id, status, userId)
      return reply.send(updated)
    } catch (e) {
      return reply.status(404).send({ message: 'Caso não encontrado.' })
    }
  }

  static async assignSpecialist(req: FastifyRequest<{ Params: { id: string }, Body: AssignSpecialistBody }>, reply: FastifyReply) {
    const { id } = req.params
    const { specialistId } = req.body
    const { sub: managerId, cargo } = req.user as { sub: string, cargo: string }

    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    try {
      const updated = await CaseService.assignSpecialist(id, specialistId, managerId)
      return reply.send(updated)
    } catch (e) {
      return reply.status(404).send({ message: 'Caso não encontrado.' })
    }
  }

  static async closeCase(req: FastifyRequest<{ Params: { id: string }, Body: CloseCaseBody }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }
    
    const updated = await CaseService.closeCase(id, req.body, userId)
    return reply.send(updated)
  }
}