// backend/src/routes/users.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma' //

export async function userRoutes(app: FastifyInstance) {
  // Protege todas as rotas de usuários
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /users - Listar todos os usuários (para Gerente)
   * -----------------------------------------------------------------
   * Usado pela página 'UserManagement.tsx'.
   * Lista todos os usuários, exceto o próprio gerente que está logado.
   */
  app.get('/users', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string; cargo: string }

    if (cargo !== 'Gerente') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId }, // Não inclui o gerente logado
          ativo: true, // Mostra apenas usuários ativos
        },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          ativo: true,
        },
      })
      return reply.status(200).send(users)
    } catch (error) {
      console.error('Erro ao listar usuários:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /users/agents - Listar Agentes Sociais ativos
   * -----------------------------------------------------------------
   * Usado pelo 'NewCaseModal.tsx' para preencher o <Select>.
   */
  app.get('/users/agents', async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: 'Agente Social',
          ativo: true, //
        },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
        },
      })
      return reply.status(200).send(agents)
    } catch (error) {
      console.error('Erro ao listar Agentes Sociais:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [GET] /users/specialists - Listar Especialistas ativos
   * -----------------------------------------------------------------
   * Usado pelo 'ManagerActions.tsx' para atribuir casos PAEFI.
   */
  app.get('/users/specialists', async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: 'Especialista',
          ativo: true, //
        },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
        },
      })
      return reply.status(200).send(specialists)
    } catch (error) {
      console.error('Erro ao listar Especialistas:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [PUT] /users/:id - Atualizar um usuário
   * -----------------------------------------------------------------
   * Usado pelo 'EditUserModal' na 'UserManagement.tsx'.
   */
  app.put('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== 'Gerente') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })
    // Schema baseado no 'editUserFormSchema'
    const bodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      cargo: z.enum(['Gerente', 'Agente Social', 'Especialista']),
    })

    try {
      const { id } = paramsSchema.parse(request.params)
      const data = bodySchema.parse(request.body)

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          nome: data.nome,
          email: data.email,
          cargo: data.cargo,
        },
      })

      return reply.status(200).send(updatedUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  /**
   * -----------------------------------------------------------------
   * [DELETE] /users/:id - Desativar um usuário
   * -----------------------------------------------------------------
   * Usado pela 'UserManagement.tsx'.
   * Não deleta o usuário (para manter o histórico), apenas o desativa.
   */
  app.delete('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== 'Gerente') {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })

    try {
      const { id } = paramsSchema.parse(request.params)

      // Em vez de deletar, atualizamos o campo 'ativo' para 'false'
      await prisma.user.update({
        where: { id },
        data: {
          ativo: false, //
        },
      })

      return reply.status(204).send() // 204 No Content (sucesso, sem corpo)
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}