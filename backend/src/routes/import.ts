// backend/src/routes/import.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ImportController } from '../controllers/ImportController'

// Schema de resposta
const importResponseSchema = z.object({
  processed: z.number(),
  created: z.number(),
  errors: z.number(),
  logs: z.array(z.string())
})

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.post('/import/cases', {
    schema: {
      tags: ['Importação'],
      summary: 'Importar planilha completa de casos (Excel/CSV)',
      consumes: ['multipart/form-data'],
      response: {
        200: importResponseSchema
      }
    }
  }, ImportController.importCases)
}