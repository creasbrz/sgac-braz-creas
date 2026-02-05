// backend/src/routes/alerts.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AlertController } from '../controllers/AlertController'

const alertResponseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  type: z.enum(['PAF_NOT_STARTED', 'PAF_STALLED', 'PAF_REVIEW_OVERDUE', 'NOT_STARTED_YET', 'RECEPTION_DELAY']),
  days: z.number(),
  urgencia: z.string()
})

export async function alertRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  server.get('/alerts', {
    schema: {
      tags: ['Alertas'],
      summary: 'Monitoramento de prazos e pendências',
      response: { 200: z.array(alertResponseSchema) }
    }
  }, AlertController.list)
}