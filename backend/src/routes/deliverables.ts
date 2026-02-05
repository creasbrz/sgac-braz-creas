// backend/src/routes/deliverables.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { DeliverableController } from '../controllers/DeliverableController'

const deliverableResponseSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  status: z.string(),
  dataSolicitacao: z.date(),
  dataEntrega: z.date().nullable(),
  responsavel: z.object({ nome: z.string() })
})

export async function deliverablesRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(deliverableResponseSchema) }
    }
  }, DeliverableController.list)

  server.post('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        tipo: z.string().min(3),
        observacoes: z.string().optional()
      })
    }
  }, DeliverableController.create)

  server.patch('/deliverables/:id', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE', 'NEGADO']),
        dataEntrega: z.string().datetime().optional()
      })
    }
  }, DeliverableController.update)
}