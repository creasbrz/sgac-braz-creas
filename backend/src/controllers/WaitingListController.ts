// backend/src/controllers/WaitingListController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { WaitingListService } from '../services/WaitingListService'
import { Cargo } from '@prisma/client'

export class WaitingListController {
  static async list(req: FastifyRequest, reply: FastifyReply) {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }
    const cases = await WaitingListService.getWaitingList(userId, cargo)
    return reply.send(cases)
  }

  static async processAction(req: FastifyRequest<{ Params: { id: string }, Body: { targetUserId?: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }

    try {
      const result = await WaitingListService.processAction({
        caseId: id,
        userId,
        cargo,
        targetUserId: req.body.targetUserId
      })
      return reply.send(result)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      if (error.message === 'FORBIDDEN_OWNERSHIP') return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
      if (error.message === 'MISSING_TARGET_USER') return reply.status(400).send({ message: 'Selecione um especialista.' })
      if (error.message === 'INVALID_TRANSITION') return reply.status(400).send({ message: 'Ação não permitida para o status atual.' })
      throw error
    }
  }
}