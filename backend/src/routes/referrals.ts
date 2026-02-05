// backend/src/routes/referrals.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ReferralController } from '../controllers/ReferralController'

const referralResponseSchema = z.object({
  id: z.string().uuid(),
  instituicao: z.string(),
  tipo: z.string(),
  motivo: z.string(),
  status: z.string(),
  retorno: z.string().nullable().optional(),
  dataEnvio: z.date(),
  autor: z.object({ nome: z.string() }).optional()
})

export async function referralRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  server.get('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(referralResponseSchema) }
    }
  }, ReferralController.list)

  server.post('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        instituicao: z.string().min(2),
        tipo: z.string().min(2),
        motivo: z.string().min(5),
      }),
      response: { 201: referralResponseSchema }
    }
  }, ReferralController.create)

  server.patch('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
        retorno: z.string().optional()
      }),
      response: { 200: referralResponseSchema }
    }
  }, ReferralController.update)

  server.delete('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, ReferralController.delete)
}