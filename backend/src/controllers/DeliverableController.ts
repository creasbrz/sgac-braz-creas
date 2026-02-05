// backend/src/controllers/DeliverableController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { DeliverableService } from '../services/DeliverableService'

export class DeliverableController {
  static async list(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const items = await DeliverableService.list(req.params.caseId)
    return reply.send(items)
  }

  static async create(req: FastifyRequest<{ Params: { caseId: string }, Body: { tipo: string, observacoes?: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    const result = await DeliverableService.create({
      caseId: req.params.caseId,
      userId,
      ...req.body
    })
    return reply.status(201).send(result)
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: { status: string, dataEntrega?: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    const { status, dataEntrega } = req.body
    
    try {
      const updated = await DeliverableService.updateStatus({
        id: req.params.id,
        userId,
        status,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined
      })
      return reply.send(updated)
    } catch (error) {
      return reply.status(404).send({ message: 'Benefício não encontrado.' })
    }
  }
}