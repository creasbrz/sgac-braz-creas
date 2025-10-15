// backend/src/routes/users.ts
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

// --- Funções Auxiliares (Helpers) ---

const handleInternalError = (reply: FastifyReply, error: unknown, message = 'Erro interno do servidor.') => {
  console.error(message, error)
  return reply.status(500).send({ message })
}

const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    return await reply.send(err)
  }
}

const onlyManager = async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.user.cargo !== 'Gerente') {
    return await reply.status(403).send({ message: 'Acesso negado. Apenas gerentes podem executar esta ação.' })
  }
}

export async function userRoutes(app: FastifyInstance) {
  // Rota para listar todos os utilizadores (protegida para gerentes)
  app.get(
    '/users',
    { onRequest: [requireAuth, onlyManager] },
    async (request, reply) => {
      try {
        const users = await prisma.user.findMany({
          where: { 
            id: { not: request.user.sub }, // Exclui o próprio gerente
            ativo: true, // Mostra apenas utilizadores ativos
          },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, email: true, cargo: true },
        })
        return await reply.send(users)
      } catch (error) {
        return handleInternalError(reply, error, 'Erro ao listar utilizadores.')
      }
    },
  )

  // Rota para listar Agentes Sociais
  app.get(
    '/users/agents',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      try {
        const agents = await prisma.user.findMany({
          where: { cargo: 'Agente Social', ativo: true },
          select: { id: true, nome: true, email: true, cargo: true },
          orderBy: { nome: 'asc' },
        })
        return await reply.status(200).send(agents)
      } catch (error) {
        return handleInternalError(reply, error, 'Erro ao buscar agentes sociais.')
      }
    },
  )

  // Rota para listar Especialistas
  app.get(
    '/users/specialists',
    { onRequest: [requireAuth] },
    async (request, reply) => {
      try {
        const specialists = await prisma.user.findMany({
          where: { cargo: 'Especialista', ativo: true },
          select: { id: true, nome: true, email: true, cargo: true },
          orderBy: { nome: 'asc' },
        })
        return await reply.status(200).send(specialists)
      } catch (error) {
        return handleInternalError(reply, error, 'Erro ao buscar especialistas.')
      }
    },
  )

  // Rota para atualizar um utilizador
  app.put(
    '/users/:id',
    { onRequest: [requireAuth, onlyManager] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      const bodySchema = z.object({
        nome: z.string().min(3),
        email: z.string().email(),
        cargo: z.enum(['Gerente', 'Agente Social', 'Especialista']),
      })

      try {
        const { id } = paramsSchema.parse(request.params)
        const data = bodySchema.parse(request.body)

        // Verifica se o novo email já está a ser usado por outro utilizador
        const emailExists = await prisma.user.findUnique({ where: { email: data.email } })
        if (emailExists && emailExists.id !== id) {
          return await reply.status(409).send({ message: 'O email fornecido já está em uso.' })
        }

        const updatedUser = await prisma.user.update({
          where: { id },
          data,
        })
        return await reply.send(updatedUser)
      } catch (error) {
        return handleInternalError(reply, error, 'Erro ao atualizar o utilizador.')
      }
    },
  )

  // Rota para "apagar" um utilizador (soft delete)
  app.delete(
    '/users/:id',
    { onRequest: [requireAuth, onlyManager] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      try {
        const { id } = paramsSchema.parse(request.params)

        // Em vez de apagar, marca o utilizador como inativo
        await prisma.user.update({
          where: { id },
          data: { ativo: false },
        })

        return await reply.status(204).send()
      } catch (error) {
        return handleInternalError(reply, error, 'Erro ao desativar o utilizador.')
      }
    },
  )
}

