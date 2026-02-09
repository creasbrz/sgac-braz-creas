// backend/src/controllers/AppointmentController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { AppointmentService } from '../services/AppointmentService'

interface CreateAppointmentBody {
  titulo: string
  data: Date
  observacoes?: string | null
  casoId: string
  tipo?: string
}

interface ListQuery {
  caseId?: string
  start?: Date
  end?: Date
}

export class AppointmentController {

  static async getUpcoming(req: FastifyRequest, reply: FastifyReply) {
    // Autocomplete funciona aqui: req.user.sub
    const upcoming = await AppointmentService.getUpcoming(req.user.sub)
    return reply.send(upcoming)
  }

  static async list(req: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) {
    const { caseId, start, end } = req.query
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    const now = new Date()
    const queryStart = start || new Date(now.getFullYear(), now.getMonth(), 1)
    const queryEnd = end || new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const events = await AppointmentService.getCalendarEvents(
      userId,
      cargo,
      queryStart,
      queryEnd,
      caseId
    )
    return reply.send(events)
  }

  static async create(req: FastifyRequest<{ Body: CreateAppointmentBody }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    const agendamento = await AppointmentService.create(userId, req.body)
    return reply.status(201).send(agendamento)
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: Partial<CreateAppointmentBody> }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      const updated = await AppointmentService.update(id, userId, cargo, req.body)
      if (!updated) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
      return reply.send(updated)
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão.' })
      throw err
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      const deleted = await AppointmentService.delete(id, userId, cargo)
      if (!deleted) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
      return reply.status(204).send()
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão.' })
      throw err
    }
  }
}