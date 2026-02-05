// backend/src/controllers/AlertController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { AlertService } from '../services/AlertService'

export class AlertController {
  static async list(req: FastifyRequest, reply: FastifyReply) {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }
    const alerts = await AlertService.getAlertsForUser(userId, cargo)
    return reply.send(alerts)
  }
}