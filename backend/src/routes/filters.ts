// backend/src/routes/filters.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function filterRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] Listar
  app.get('/filters', async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      return reply.send(filters)
    } catch (error) {
      console.error("❌ ERRO AO BUSCAR FILTROS:", error)
      return reply.status(500).send({ message: 'Erro ao buscar filtros.' })
    }
  })

  // [POST] Salvar
  app.post('/filters', async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    // CORREÇÃO AQUI: Usamos z.any() para o config para evitar o erro interno do Zod
    const bodySchema = z.object({
      nome: z.string().min(1, "Dê um nome ao filtro"),
      config: z.any() 
    })

    try {
      const { nome, config } = bodySchema.parse(request.body)

      // Verifica usuário (debug)
      const userExists = await prisma.user.findUnique({ where: { id: userId } })
      if (!userExists) {
        return reply.status(401).send({ message: 'Sessão inválida. Faça login novamente.' })
      }

      // Limite
      const count = await prisma.savedFilter.count({ where: { userId } })
      if (count >= 10) {
        return reply.status(400).send({ message: 'Limite de 10 filtros atingido.' })
      }

      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {}, // Garante que não é null
          userId
        }
      })

      return reply.status(201).send(filter)

    } catch (error) {
      console.error("❌ ERRO NO POST /filters:", error)
      return reply.status(500).send({ message: 'Erro ao salvar filtro.' })
    }
  })

  // [DELETE] Apagar
  app.delete('/filters/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { sub: userId } = request.user as { sub: string }

    try {
      const { id } = paramsSchema.parse(request.params)

      const filter = await prisma.savedFilter.findUnique({ where: { id } })
      if (!filter || filter.userId !== userId) {
        return reply.status(403).send({ message: 'Sem permissão.' })
      }

      await prisma.savedFilter.delete({ where: { id } })
      return reply.status(204).send()

    } catch (error) {
      console.error("❌ ERRO NO DELETE /filters:", error)
      return reply.status(500).send({ message: 'Erro ao remover filtro.' })
    }
  })
}