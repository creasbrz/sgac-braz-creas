// backend/src/routes/rma.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { RmaController } from '../controllers/RMAController'

export async function rmaRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get('/rma/generate', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Gerar relatório RMA completo (Mensal)',
      querystring: z.object({
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2020),
      })
    },
    // Middleware de Auth implícito (se necessário adicionar hook onRequest)
    onRequest: async (req, reply) => {
        try { await req.jwtVerify() } catch { return reply.status(401).send() }
    }
  }, RmaController.generate)
}