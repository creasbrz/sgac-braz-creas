// backend/src/controllers/ReferralController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { ReferralService } from '../services/ReferralService'

interface CreateReferralBody {
  instituicao: string
  tipo: string
  motivo: string
}

export class ReferralController {
  static async list(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const referrals = await ReferralService.listByCase(req.params.caseId)
    return reply.send(referrals)
  }

  static async create(req: FastifyRequest<{ Params: { caseId: string }, Body: CreateReferralBody }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const result = await ReferralService.create({
        caseId: req.params.caseId,
        userId,
        ...req.body
      })
      return reply.status(201).send(result)
    } catch (error: any) {
      if (error.message === 'CASE_NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado' })
      throw error
    }
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: { status: any, retorno?: string } }>, reply: FastifyReply) {
    try {
      const updated = await ReferralService.update({
        id: req.params.id,
        ...req.body
      })
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })
      throw error
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      await ReferralService.delete(req.params.id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão.' })
      throw error
    }
  }
}