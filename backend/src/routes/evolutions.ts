// backend/src/routes/evolutions.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { EvolutionController } from '../controllers/EvolutionController'

const authorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cargo: z.nativeEnum(Cargo).optional()
})

const evolutionResponseSchema = z.object({
  id: z.string().uuid(),
  conteudo: z.string(),
  sigilo: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  autorId: z.string(),
  autor: authorSchema
})

export async function evolutionRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. LISTAR
  server.get('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      params: z.object({ caseId: z.string().uuid() }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(50).default(10)
      }),
      response: {
        200: z.object({
          items: z.array(evolutionResponseSchema),
          total: z.number(),
        })
      }
    }
  }, EvolutionController.list)

  // 2. CRIAR
  server.post('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5),
        sigilo: z.boolean().default(false)
      }),
      response: { 201: evolutionResponseSchema }
    }
  }, EvolutionController.create)

  // 3. EDITAR
  server.patch('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5).optional(),
        sigilo: z.boolean().optional()
      }),
      response: { 200: evolutionResponseSchema }
    }
  }, EvolutionController.update)

  // 4. DELETAR
  server.delete('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, EvolutionController.delete)
}