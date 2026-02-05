// backend/src/routes/waitingList.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { WaitingListController } from '../controllers/WaitingListController'

const waitingCaseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  dataEntrada: z.date(),
  urgencia: z.string(),
  pesoUrgencia: z.number(),
  violacao: z.array(z.string()), 
  status: z.string(),
  agenteAcolhida: z.object({ nome: z.string() }).nullable().optional(),
  especialistaPAEFI: z.object({ nome: z.string() }).nullable().optional()
})

export async function waitingListRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  server.get('/cases/waiting', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Listar casos parados aguardando ação do usuário logado',
      response: {
        200: z.array(waitingCaseSchema)
      }
    }
  }, WaitingListController.list)

  server.patch('/cases/waiting/:id/assign', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Realizar ação da fila (Iniciar Acolhida, Distribuir ou Aceitar)',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ targetUserId: z.string().uuid().optional() }),
      response: {
        200: z.object({ status: z.string() })
      }
    }
  }, WaitingListController.processAction)
}