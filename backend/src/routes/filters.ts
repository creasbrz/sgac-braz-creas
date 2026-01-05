import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function filterRoutes(app: FastifyInstance) {
  
  // Middleware de Autenticação
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Sessão expirada ou inválida.' })
    }
  })

  // [GET] Listar Filtros Salvos do Usuário
  app.get('/filters', async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    try {
      const filters = await prisma.savedFilter.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      return reply.send(filters)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao buscar seus filtros.' })
    }
  })

  // [POST] Salvar Novo Filtro
  app.post('/filters', async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    
    // O 'config' armazena o estado do formulário do Frontend (território, status, violação)
    // Ex: { territorio: "Vila São José", violacao: "Violência Física", status: "ATIVO" }
    const bodySchema = z.object({
      nome: z.string().min(1, "Dê um nome para identificar este filtro (Ex: Meus casos na Vila)"),
      config: z.any() 
    })

    try {
      const { nome, config } = bodySchema.parse(request.body)

      // Limite de segurança: Evitar que um usuário lote o banco com filtros inúteis
      const count = await prisma.savedFilter.count({ where: { userId } })
      if (count >= 15) {
        return reply.status(400).send({ message: 'Limite de 15 filtros atingido. Exclua alguns antigos.' })
      }

      const filter = await prisma.savedFilter.create({
        data: {
          nome,
          config: config ?? {}, 
          userId
        }
      })

      return reply.status(201).send(filter)

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao salvar filtro.' })
    }
  })

  // [PATCH] Atualizar Filtro Existente (Renomear ou mudar regras)
  app.patch('/filters/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      nome: z.string().min(1).optional(),
      config: z.any().optional()
    })

    const { sub: userId } = request.user as { sub: string }
    const { id } = paramsSchema.parse(request.params)
    const { nome, config } = bodySchema.parse(request.body)

    try {
      // Verifica propriedade
      const existing = await prisma.savedFilter.findUnique({ where: { id } })
      
      if (!existing) return reply.status(404).send({ message: 'Filtro não encontrado.' })
      if (existing.userId !== userId) return reply.status(403).send({ message: 'Você só pode editar seus próprios filtros.' })

      const updated = await prisma.savedFilter.update({
        where: { id },
        data: {
          nome,
          config: config ?? undefined // undefined faz o Prisma ignorar o campo se não foi enviado
        }
      })

      return reply.send(updated)

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao atualizar filtro.' })
    }
  })

  // [DELETE] Apagar Filtro
  app.delete('/filters/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { sub: userId } = request.user as { sub: string }

    try {
      const { id } = paramsSchema.parse(request.params)

      const filter = await prisma.savedFilter.findUnique({ where: { id } })
      
      if (!filter) return reply.status(404).send({ message: 'Filtro não encontrado.' })
      if (filter.userId !== userId) {
        return reply.status(403).send({ message: 'Sem permissão para excluir este filtro.' })
      }

      await prisma.savedFilter.delete({ where: { id } })
      return reply.status(204).send()

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao remover filtro.' })
    }
  })
}