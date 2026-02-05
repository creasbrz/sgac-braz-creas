// backend/src/controllers/AuditController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { AuditService, AuditFilters } from '../services/AuditService'
import { Cargo } from '@prisma/client'

export class AuditController {
  static async list(req: FastifyRequest<{ Querystring: AuditFilters }>, reply: FastifyReply) {
    const { cargo } = req.user as { cargo: Cargo }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito.' })

    const result = await AuditService.listLogs(req.query)
    return reply.send({
      data: result.items,
      meta: {
        page: req.query.page,
        pageSize: req.query.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / req.query.pageSize)
      }
    })
  }

  static async getStats(req: FastifyRequest, reply: FastifyReply) {
    const { cargo } = req.user as { cargo: Cargo }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito.' })

    const stats = await AuditService.getDailyStats()
    return reply.send(stats)
  }
}