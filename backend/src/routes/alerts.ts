// backend/src/routes/alerts.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AlertService } from '../services/AlertService'

// Schema de Resposta (Documentação e Type Safety)
const alertResponseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  type: z.enum([
    'PAF_NOT_STARTED', 
    'PAF_STALLED', 
    'PAF_REVIEW_OVERDUE', 
    'NOT_STARTED_YET', 
    'RECEPTION_DELAY'
  ]),
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
      summary: 'Monitoramento de prazos e pendências (Sinais de Trânsito)',
      response: {
        200: z.array(alertResponseSchema)
      }
    }
  }, async (req, reply) => {
    try {
      // 1. Extração de Contexto
      const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

      // 2. Chamada ao Service (Regra de Negócio Pura)
      const alerts = await AlertService.getAlertsForUser(userId, cargo)

      // 3. Resposta
      return reply.send(alerts)

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar alertas de monitoramento.' })
    }
  })
}