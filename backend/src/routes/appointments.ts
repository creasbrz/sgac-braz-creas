// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppointmentService } from '../services/AppointmentService'

// --- Schemas (Apenas os de I/O da API) ---

const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.coerce.date(), // coerce garante que strings ISO virem Date
  end: z.coerce.date().nullable().optional(),
  type: z.enum(['INDIVIDUAL', 'GRUPO']),
  resourceId: z.string().optional(),
  description: z.string().optional(),
  status: z.string()
})

const upcomingSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  data: z.coerce.date(),
  tipo: z.string().optional(),
  caso: z.object({ 
    id: z.string().uuid(), 
    nomeCompleto: z.string() 
  }).nullable().optional()
})

const createAppointmentSchema = z.object({
  titulo: z.string().min(3, "Título muito curto"),
  data: z.coerce.date(),
  observacoes: z.string().nullable().optional(), 
  casoId: z.string().uuid(),
  tipo: z.string().optional()
})

export async function appointmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware de Auth
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Widget Dashboard
  server.get('/stats/my-agenda', {
    schema: {
      tags: ['Agenda'],
      summary: 'Próximos compromissos do usuário (Widget)',
      response: { 200: z.array(upcomingSchema) }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string }
    const upcoming = await AppointmentService.getUpcoming(userId)
    return reply.send(upcoming)
  })

  // [GET] Calendário Principal
  server.get('/appointments', {
    schema: {
      tags: ['Agenda'],
      summary: 'Listar compromissos (Agendamentos + Grupos)',
      querystring: z.object({ 
        caseId: z.string().uuid().optional(), 
        start: z.coerce.date().optional(), 
        end: z.coerce.date().optional(),    
      }),
      response: { 200: z.array(calendarEventSchema) }
    }
  }, async (req, reply) => {
    const { caseId, start, end } = req.query
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    // Define defaults se não enviado (Mês atual)
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
  })

  // [POST] Criar
  server.post('/appointments', {
    schema: {
      tags: ['Agenda'],
      body: createAppointmentSchema
    }
  }, async (req, reply) => {
    const data = req.body
    const { sub: userId } = req.user as { sub: string }

    const agendamento = await AppointmentService.create(userId, data)
    
    return reply.status(201).send(agendamento)
  })

  // [PUT] Editar
  server.put('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() }),
      body: createAppointmentSchema.partial()
    }
  }, async (req, reply) => {
    const { id } = req.params
    const data = req.body
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      const updated = await AppointmentService.update(id, userId, cargo, data)
      if (!updated) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
      
      return reply.send(updated)
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão para editar este agendamento.' })
      throw err
    }
  })

  // [DELETE] Remover
  server.delete('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() })
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      const deleted = await AppointmentService.delete(id, userId, cargo)
      if (!deleted) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
      
      return reply.status(204).send()
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão para remover este agendamento.' })
      throw err
    }
  })
}