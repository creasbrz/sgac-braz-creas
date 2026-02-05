// backend/src/routes/filters.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { FilterController } from '../controllers/FilterController'

const filterResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  config: z.any(),
  createdAt: z.date()
})

const saveFilterSchema = z.object({
  nome: z.string().min(1).max(50),
  config: z.record(z.string(), z.any()).or(z.any())
})

export async function filterRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Listar filtros salvos do usuário',
      response: { 200: z.array(filterResponseSchema) }
    }
  }, FilterController.list)

  server.post('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Salvar configuração de filtro',
      body: saveFilterSchema,
      response: { 201: filterResponseSchema }
    }
  }, FilterController.create)

  server.patch('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Atualizar filtro existente',
      params: z.object({ id: z.string().uuid() }),
      body: saveFilterSchema.partial(),
      response: { 200: filterResponseSchema }
    }
  }, FilterController.update)

  server.delete('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Remover filtro salvo',
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, FilterController.delete)
}