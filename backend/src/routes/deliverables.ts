// backend/src/routes/deliverables.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { DeliverableService } from '../services/DeliverableService'

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

  // [GET] Listar
  server.get('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(deliverableResponseSchema) }
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const items = await DeliverableService.list(caseId)
    return reply.send(items)
  })

  // [POST] Criar
  server.post('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        tipo: z.string().min(3),
        observacoes: z.string().optional()
      })
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const { tipo, observacoes } = req.body
    const { sub: userId } = req.user as { sub: string }

    try {
      const result = await DeliverableService.create({
        caseId,
        userId,
        tipo,
        observacoes
      })
      return reply.status(201).send(result)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao criar solicitação de benefício.' })
    }
  })

  // [PATCH] Atualizar Status
  server.patch('/deliverables/:id', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE', 'NEGADO']),
        dataEntrega: z.string().datetime().optional()
      })
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { status, dataEntrega } = req.body
    const { sub: userId } = req.user as { sub: string }

    try {
      const updated = await DeliverableService.updateStatus({
        id,
        userId,
        status,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined
      })
      return reply.send(updated)
    } catch (error) {
      req.log.error(error)
      // Prisma P2025 = Record not found
      return reply.status(404).send({ message: 'Benefício não encontrado.' })
    }
  })
}