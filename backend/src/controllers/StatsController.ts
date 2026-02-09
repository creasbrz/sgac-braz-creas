// backend/src/controllers/StatsController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { StatsService } from '../services/StatsService'
import { z } from 'zod'

export class StatsController {
  
  static async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    // Extrai dados do usuário logado (injetados pelo JWT)
    const user = request.user as { sub: string, cargo: string }
    const data = await StatsService.getDashboard(user)
    return reply.send(data)
  }

  static async getProductivity(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      mode: z.enum(['workload', 'performance']).default('workload'),
      months: z.coerce.number().default(1)
    })
    
    const { mode, months } = querySchema.parse(request.query)
    const data = await StatsService.getProductivity(mode, months)
    return reply.send(data)
  }

  static async getVigilance(request: FastifyRequest, reply: FastifyReply) {
    const data = await StatsService.getVigilanceStats()
    return reply.send(data)
  }

  static async getAdvanced(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      months: z.coerce.number().min(1).max(60).default(12),
      violacao: z.string().optional()
    })

    const { months, violacao } = querySchema.parse(request.query)
    const data = await StatsService.getAdvancedStats(months, violacao)
    return reply.send(data)
  }

  static async getActivity(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as { sub: string, cargo: string }
    const data = await StatsService.getRecentActivity(user)
    return reply.send(data)
  }
}