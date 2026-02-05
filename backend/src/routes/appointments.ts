// backend/src/routes/appointments.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AppointmentController } from '../controllers/AppointmentController'

const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.coerce.date(),
  end: z.coerce.date().nullable().optional(),
  type: z.string(),
  resourceId: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
  nomeCompleto: z.string().optional()
})

const createAppointmentSchema = z.object({
  titulo: z.string().min(3),
  data: z.coerce.date(),
  observacoes: z.string().nullable().optional(),
  casoId: z.string().uuid(),
  tipo: z.string().optional()
})

export async function appointmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. Widget Dashboard
  server.get('/stats/my-agenda', {
    schema: { tags: ['Agenda'] }
  }, AppointmentController.getUpcoming)

  // 2. Calendário Principal
  server.get('/appointments', {
    schema: {
      tags: ['Agenda'],
      querystring: z.object({ 
        caseId: z.string().uuid().optional(), 
        start: z.coerce.date().optional(), 
        end: z.coerce.date().optional(),    
      }),
      response: { 200: z.array(calendarEventSchema) }
    }
  }, AppointmentController.list)

  // 3. Criar
  server.post('/appointments', {
    schema: { tags: ['Agenda'], body: createAppointmentSchema }
  }, AppointmentController.create)

  // 4. Editar
  server.put('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() }),
      body: createAppointmentSchema.partial()
    }
  }, AppointmentController.update)

  // 5. Deletar
  server.delete('/appointments/:id', {
    schema: {
      tags: ['Agenda'],
      params: z.object({ id: z.string().uuid() })
    }
  }, AppointmentController.delete)
}