// backend/src/routes/users.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { UserService } from '../services/UserService'

export async function userRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // --- Schemas ---
  const userResponseSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email(),
    cargo: z.nativeEnum(Cargo),
    matricula: z.string().nullable().optional(),
    ativo: z.boolean(),
  })

  // Middleware Global
  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { await reply.status(401).send({ message: 'Token inválido ou expirado.' }) }
  })

  // 1. [POST] CRIAR USUÁRIO
  server.post('/users', {
    schema: {
      tags: ['Usuários'],
      summary: 'Cadastrar novo servidor (Apenas Gerentes)',
      security: [{ bearerAuth: [] }],
      body: z.object({
        nome: z.string().min(3),
        email: z.string().email(),
        matricula: z.string().optional(),
        cargo: z.string().transform((val) => {
          if (val === 'Agente Social') return Cargo.Agente_Social
          if (Object.values(Cargo).includes(val as Cargo)) return val as Cargo
          throw new Error('Cargo inválido')
        }),
        senhaInicial: z.string().min(6).default('123456')
      }),
      response: { 201: userResponseSchema }
    }
  }, async (request, reply) => {
    const { cargo: userCargo } = request.user as { cargo: string }
    if (userCargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito a gerentes.' })

    try {
      const user = await UserService.create(request.body)
      return reply.status(201).send(user)
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') return reply.status(409).send({ message: 'E-mail já cadastrado.' })
      throw error
    }
  })

  // 2. [PATCH] ALTERAR MINHA SENHA
  server.patch('/users/me/password', {
    schema: {
      tags: ['Usuários'],
      summary: 'Alterar a própria senha',
      security: [{ bearerAuth: [] }],
      body: z.object({ senhaAtual: z.string(), novaSenha: z.string().min(6) }),
      response: { 200: z.object({ message: z.string() }) }
    }
  }, async (request, reply) => {
    const { senhaAtual, novaSenha } = request.body
    const userId = (request.user as any).sub

    try {
      await UserService.changePassword(userId, senhaAtual, novaSenha)
      return reply.send({ message: 'Senha alterada com sucesso!' })
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Usuário não encontrado.' })
      if (error.message === 'INVALID_PASSWORD') return reply.status(400).send({ message: 'Senha atual incorreta.' })
      throw error
    }
  })

  // 3. [GET] LISTAR USUÁRIOS
  server.get('/users', {
    schema: {
      tags: ['Usuários'],
      summary: 'Listar usuários ativos com filtros opcionais',
      security: [{ bearerAuth: [] }],
      querystring: z.object({ cargo: z.string().optional(), active: z.coerce.boolean().optional().default(true) }),
      response: { 200: z.array(userResponseSchema) }
    }
  }, async (request, reply) => {
    const { sub: userId } = request.user as { sub: string }
    const { cargo, active } = request.query
    
    let cargoFilter: Cargo | undefined
    if (cargo) {
       if (cargo === 'Agente Social') cargoFilter = Cargo.Agente_Social
       else if (Object.values(Cargo).includes(cargo as Cargo)) cargoFilter = cargo as Cargo
    }

    const users = await UserService.listAll(userId, cargoFilter, active)
    return reply.send(users)
  })

  // 4. [GET] LISTAR AGENTES
  server.get('/users/agents', {
    schema: {
      tags: ['Usuários'],
      summary: 'Listar apenas Agentes Sociais ativos',
      security: [{ bearerAuth: [] }],
      response: { 200: z.array(z.object({ id: z.string(), nome: z.string() })) }
    }
  }, async (request, reply) => {
    const agents = await UserService.listAgents()
    return reply.send(agents)
  })

  // 5. [GET] LISTAR ESPECIALISTAS COM CONTAGEM
  server.get('/users/specialists', {
    schema: {
      tags: ['Usuários'],
      summary: 'Listar APENAS Especialistas para distribuição com contagem de casos',
      security: [{ bearerAuth: [] }],
      response: {
        200: z.array(z.object({ 
            id: z.string(), 
            nome: z.string(), 
            cargo: z.string(), 
            activeCases: z.number() 
        }))
      }
    }
  }, async (request, reply) => {
    try {
      const results = await UserService.listSpecialistsWithLoad()
      return reply.send(results)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: "Erro interno ao buscar equipe." })
    }
  })

  // 6. [PUT] EDITAR USUÁRIO
  server.put('/users/:id', {
    schema: {
      tags: ['Usuários'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        nome: z.string().min(3),
        email: z.string().email(),
        matricula: z.string().optional(),
        cargo: z.string().transform((val) => {
            if (val === 'Agente Social') return Cargo.Agente_Social
            if (Object.values(Cargo).includes(val as Cargo)) return val as Cargo
            throw new Error('Cargo inválido')
        }),
      }),
      response: { 200: userResponseSchema }
    }
  }, async (request, reply) => {
    const { cargo: requestCargo } = request.user as { cargo: string }
    if (requestCargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    const updatedUser = await UserService.update(request.params.id, request.body)
    return reply.send(updatedUser)
  })

  // 7. [DELETE] DESATIVAR USUÁRIO
  server.delete('/users/:id', {
    schema: {
      tags: ['Usuários'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    await UserService.deactivate(request.params.id)
    return reply.status(204).send()
  })
}