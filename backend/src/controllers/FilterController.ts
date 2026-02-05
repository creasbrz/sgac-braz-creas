import { FastifyReply, FastifyRequest } from 'fastify'
import { FilterService } from '../services/FilterService'

export class FilterController {
  static async list(req: FastifyRequest, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    const filters = await FilterService.listByUser(userId)
    return reply.send(filters)
  }

  static async create(req: FastifyRequest<{ Body: { nome: string, config: any } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const filter = await FilterService.create(userId, req.body.nome, req.body.config)
      return reply.status(201).send(filter)
    } catch (e: any) {
      if (e.message === 'QUOTA_EXCEEDED') return reply.status(400).send({ message: 'Limite de filtros atingido.' })
      throw e
    }
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: { nome?: string, config?: any } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const updated = await FilterService.update(req.params.id, userId, req.body.nome, req.body.config)
      return reply.send(updated)
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Filtro não encontrado.' })
      if (e.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão.' })
      throw e
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      await FilterService.delete(req.params.id, userId)
      return reply.status(204).send()
    } catch (e: any) {
      return reply.status(404).send({ message: 'Filtro não encontrado ou sem permissão.' })
    }
  }
}