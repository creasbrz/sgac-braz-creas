// backend/src/routes/filters.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// --- Schemas ---

const filterResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  config: z.any(), // JSON do banco
  createdAt: z.date()
})

const createFilterSchema = z.object({
  nome: z.string().min(1, "O nome do filtro é obrigatório"),
  // Aceita um objeto JSON livre (estado do formulário de filtros do front)
  config: z.record(z.string(), z.any()).or(z.any()) 
})

export async function filterRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware de Autenticação
  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Sessão expirada ou inválida.' }) }
  })

  // 1. [GET] Listar Filtros Salvos
  server.get('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Listar filtros personalizados salvos pelo usuário',
      response: {
        200: z.array(filterResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      return reply.send(filters)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao buscar filtros.' })
    }
  })

  // 2. [POST] Salvar Novo Filtro
  server.post('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Salvar configuração atual de filtros',
      body: createFilterSchema,
      response: {
        201: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    const { nome, config } = request.body

    try {
      // Limite de segurança (Quota por usuário)
      const count = await prisma.savedFilter.count({ where: { userId } })
      if (count >= 15) {
        return reply.status(400).send({ message: 'Limite de 15 filtros atingido. Exclua alguns antigos para salvar novos.' })
      }

      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {}, // Garante objeto vazio se null
          userId
        }
      })

      return reply.status(201).send(filter)

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao salvar filtro.' })
    }
  })

  // 3. [PATCH] Atualizar Filtro
  server.patch('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Atualizar nome ou regras de um filtro existente',
      params: z.object({ id: z.string().uuid() }),
      body: createFilterSchema.partial(), // Campos opcionais no update
      response: {
        200: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { nome, config } = request.body
    const { sub: userId } = request.user as { sub: string }

    try {
      const existing = await prisma.savedFilter.findUnique({ where: { id } })
      
      if (!existing) return reply.status(404).send({ message: 'Filtro não encontrado.' })
      if (existing.userId !== userId) return reply.status(403).send({ message: 'Você só pode editar seus próprios filtros.' })

      const updated = await prisma.savedFilter.update({
        where: { id },
        data: {
          nome,
          config: config ?? undefined
        }
      })

      return reply.send(updated)

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao atualizar filtro.' })
    }
  })

  // 4. [DELETE] Apagar Filtro
  server.delete('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Remover um filtro salvo',
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { sub: userId } = request.user as { sub: string }

    try {
      const filter = await prisma.savedFilter.findUnique({ where: { id } })
      
      if (!filter) return reply.status(404).send({ message: 'Filtro não encontrado.' })
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: 'Sem permissão para excluir este filtro.' })
      }

      await prisma.savedFilter.delete({ where: { id } })
      return reply.status(204).send()

    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao remover filtro.' })
    }
  })
}