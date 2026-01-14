// backend/src/routes/filters.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

// --- SCHEMAS ---

// Schema de resposta (o que o front recebe)
const filterResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  config: z.any(), // JSON flexível para armazenar o estado dos filtros do front
  createdAt: z.date()
})

// Schema de criação/edição
const saveFilterSchema = z.object({
  nome: z.string().min(1, "O nome do filtro é obrigatório").max(50, "Nome muito longo"),
  config: z.record(z.string(), z.any()).or(z.any()) // Aceita objeto JSON
})

export async function filterRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware Global de Autenticação para estas rotas
  server.addHook('onRequest', async (request, reply) => {
    try { 
      await request.jwtVerify() 
    } catch (err) { 
      return reply.status(401).send({ message: 'Sessão inválida ou expirada.' }) 
    }
  })

  // 1. [GET] Listar Filtros
  server.get('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Listar filtros salvos do usuário',
      response: {
        200: z.array(filterResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    const filters = await prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send(filters)
  })

  // 2. [POST] Salvar Novo Filtro
  server.post('/filters', {
    schema: {
      tags: ['Filtros'],
      summary: 'Salvar configuração de filtro',
      body: saveFilterSchema,
      response: {
        201: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    const { nome, config } = request.body

    // Limite de segurança (Quota por usuário)
    const count = await prisma.savedFilter.count({ where: { userId } })
    if (count >= 20) {
      return reply.status(400).send({ message: 'Limite de filtros salvos atingido (Máx: 20).' })
    }

    const filter = await prisma.savedFilter.create({
      data: {
        nome,
        config: config ?? {},
        userId
      }
    })

    return reply.status(201).send(filter)
  })

  // 3. [PATCH] Atualizar Filtro
  server.patch('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Atualizar filtro existente',
      params: z.object({ id: z.string().uuid() }),
      body: saveFilterSchema.partial(), // Permite envio parcial
      response: {
        200: filterResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { nome, config } = request.body
    const { sub: userId } = request.user as { sub: string }

    const existing = await prisma.savedFilter.findUnique({ where: { id } })
    
    if (!existing) return reply.status(404).send({ message: 'Filtro não encontrado.' })
    if (existing.userId !== userId) return reply.status(403).send({ message: 'Sem permissão.' })

    const updated = await prisma.savedFilter.update({
      where: { id },
      data: {
        nome,
        config: config ?? undefined
      }
    })

    return reply.send(updated)
  })

  // 4. [DELETE] Excluir Filtro
  server.delete('/filters/:id', {
    schema: {
      tags: ['Filtros'],
      summary: 'Remover filtro salvo',
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { sub: userId } = request.user as { sub: string }

    const existing = await prisma.savedFilter.findUnique({ where: { id } })
    
    if (!existing) return reply.status(404).send({ message: 'Filtro não encontrado.' })
    if (existing.userId !== userId) return reply.status(403).send({ message: 'Sem permissão.' })

    await prisma.savedFilter.delete({ where: { id } })

    return reply.status(204).send()
  })
}