// backend/src/routes/attachments.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AttachmentController } from '../controllers/AttachmentController'

const attachmentResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  tipo: z.string(),
  url: z.string(),
  tamanho: z.number().nullable(),
  createdAt: z.date(),
  autor: z.object({ nome: z.string() }).optional()
})

export async function attachmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/cases/:caseId/attachments', {
    schema: {
      tags: ['Anexos'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(attachmentResponseSchema) }
    }
  }, AttachmentController.list)

  server.post('/attachments', {
    schema: {
      tags: ['Anexos'],
      summary: 'Upload de arquivo (Multipart)',
      querystring: z.object({ caseId: z.string().uuid() }), 
    }
  }, AttachmentController.upload)

  server.delete('/attachments/:id', {
    schema: {
      tags: ['Anexos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, AttachmentController.delete)
}