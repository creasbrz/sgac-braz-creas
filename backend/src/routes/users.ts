// backend/src/routes/users.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo } from '@prisma/client' // [CORREÇÃO] Importando o Enum

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
   * [GET] /users - Listar todos os usuários (para Gerente)
   */
  app.get('/users', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string; cargo: string }

    if (cargo !== Cargo.Gerente) { // [CORREÇÃO]
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId }, // Não inclui o próprio gerente logado
          ativo: true,
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
   * [GET] /users/agents - Listar Agentes Sociais ativos
   * Usado no Modal de Novo Caso
   */
  app.get('/users/agents', async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: Cargo.Agente_Social, // [CORREÇÃO] Uso do Enum com underline
          ativo: true,
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
   * [GET] /users/specialists - Listar Especialistas ativos
   */
  app.get('/users/specialists', async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: Cargo.Especialista, // [CORREÇÃO]
          ativo: true,
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
   * [PUT] /users/:id - Atualizar um usuário
   */
  app.put('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })
    
    // O body ainda recebe strings do frontend, precisamos converter para Enum se necessário
    // Mas o Zod com nativeEnum ajuda a validar
    const bodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      cargo: z.nativeEnum(Cargo), // Valida se é "Gerente", "Agente_Social", etc.
    })

    try {
      const { id } = paramsSchema.parse(request.params)
      // Aqui pode dar erro se o frontend enviar "Agente Social" com espaço.
      // Idealmente o frontend deve enviar o valor do enum ("Agente_Social").
      // Se o frontend envia com espaço, teremos que tratar aqui.
      const rawData = request.body as any
      
      // Pequeno "adapter" caso o frontend mande com espaço
      let cargoValue = rawData.cargo
      if (cargoValue === 'Agente Social') cargoValue = Cargo.Agente_Social
      if (cargoValue === 'Especialista') cargoValue = Cargo.Especialista
      if (cargoValue === 'Gerente') cargoValue = Cargo.Gerente

      const data = bodySchema.parse({ ...rawData, cargo: cargoValue })

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
   * [DELETE] /users/:id - Desativar um usuário
   */
  app.delete('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })

    try {
      const { id } = paramsSchema.parse(request.params)

      await prisma.user.update({
        where: { id },
        data: {
          ativo: false,
        },
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })
}