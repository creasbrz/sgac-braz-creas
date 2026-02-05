// backend/src/controllers/ReportController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { ReportService } from '../services/ReportService'

export class ReportController {
  static async getTeamOverview(req: FastifyRequest, reply: FastifyReply) {
    const overview = await ReportService.getTeamOverview()
    return reply.send(overview)
  }

  static async getDismissals(req: FastifyRequest<{ Querystring: { months: number } }>, reply: FastifyReply) {
    const report = await ReportService.getDismissalsReport(req.query.months)
    return reply.send(report)
  }

  static async getVigilance(req: FastifyRequest, reply: FastifyReply) {
    const stats = await ReportService.getVigilanceStats()
    return reply.send(stats)
  }
}