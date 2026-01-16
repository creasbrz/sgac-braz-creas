// backend/src/routes/evolutions.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { EvolutionService } from '../services/EvolutionService'

// --- Schemas ---

const authorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cargo: z.nativeEnum(Cargo)
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

  // 1. [GET] Listar Evoluções
  server.get('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Listar histórico de evoluções de um caso',
      params: z.object({ caseId: z.string().uuid() }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(50).default(10)
      }),
      response: {
        200: z.object({
          items: z.array(evolutionResponseSchema),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const { page, pageSize } = request.query
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    try {
      const { items, total } = await EvolutionService.list({
        caseId,
        userId,
        cargo,
        page,
        pageSize
      })

      return reply.send({
        items,
        total,
        page,
        totalPages: Math.ceil(total / pageSize)
      })
    } catch (error: any) {
      if (error.message === 'CASE_NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      throw error
    }
  })

  // 2. [POST] Criar Evolução
  server.post('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Adicionar nova evolução ao prontuário',
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5, "A evolução deve ter conteúdo relevante."),
        sigilo: z.boolean().default(false)
      }),
      response: {
        201: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const { sub: userId } = request.user as { sub: string }

    const evolucao = await EvolutionService.create({
      caseId,
      userId,
      ...request.body
    })

    return reply.status(201).send(evolucao)
  })

  // 3. [PATCH] Editar Evolução
  server.patch('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Editar conteúdo de uma evolução (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5).optional(),
        sigilo: z.boolean().optional()
      }),
      response: {
        200: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    try {
      const updated = await EvolutionService.update(request.params.id, userId, request.body)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Evolução não encontrada.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Você só pode editar evoluções criadas por você.' })
      throw error
    }
  })

  // 4. [DELETE] Excluir Evolução
  server.delete('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Remover uma evolução (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }

    try {
      await EvolutionService.delete(request.params.id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Evolução não encontrada.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Você só pode excluir evoluções criadas por você.' })
      throw error
    }
  })
}