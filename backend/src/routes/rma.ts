// backend/src/routes/rma.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { RmaController } from '../controllers/RmaController' // [IMPORTANTE] Deve bater com o nome do arquivo

export async function rmaRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Autenticação
  api.addHook('onRequest', async (req) => await req.jwtVerify())

  api.get('/', {
    schema: {
      tags: ['Relatórios'],
      summary: 'Gerar dados do RMA (Registro Mensal de Atendimentos)',
      querystring: z.object({
        month: z.coerce.number().min(1).max(12),
        year: z.coerce.number().min(2020)
      })
    }
  }, RmaController.getRma)
}