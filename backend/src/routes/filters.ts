// backend/src/routes/filters.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

interface UserPayload {
  sub: string
}

export async function filterRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] Listar Filtros Salvos
  app.get('/filters', async (request, reply) => {
    const { sub: userId } = request.user as UserPayload
    
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

  // [POST] Salvar Novo Filtro
  app.post('/filters', async (request, reply) => {
    const { sub: userId } = request.user as UserPayload
    
    const bodySchema = z.object({
      nome: z.string().min(1, "Dê um nome ao filtro"),
      // Melhoria: Aceita qualquer objeto JSON válido, mas força ser um objeto, não string/número solto
      config: z.record(z.string(), z.any()).default({}) 
    })

    try {
      const { nome, config } = bodySchema.parse(request.body)

      // Regra de Negócio: Limite de 10 filtros por usuário
      const count = await prisma.savedFilter.count({ where: { userId } })
      if (count >= 10) {
        return reply.status(400).send({ message: 'Você atingiu o limite de 10 filtros salvos.' })
      }

      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config, // Agora garantido que é um objeto JSON
          userId
        }
      })

      return reply.status(201).send(filter)

    } catch (error) {
      console.error("❌ ERRO NO POST /filters:", error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ message: 'Dados inválidos.', errors: error.flatten().fieldErrors })
      }
      return reply.status(500).send({ message: 'Erro ao salvar filtro.' })
    }
  })

  // [DELETE] Apagar Filtro
  app.delete('/filters/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { sub: userId } = request.user as UserPayload

    try {
      const { id } = paramsSchema.parse(request.params)

      const filter = await prisma.savedFilter.findUnique({ where: { id } })
      
      if (!filter) return reply.status(404).send({ message: 'Filtro não encontrado.' })
      
      // Segurança: Só o dono apaga
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: 'Você não tem permissão para apagar este filtro.' })
      }

      await prisma.savedFilter.delete({ where: { id } })
      return reply.status(204).send()

    } catch (error) {
      console.error("❌ ERRO NO DELETE /filters:", error)
      return reply.status(500).send({ message: 'Erro ao remover filtro.' })
    }
  })
}