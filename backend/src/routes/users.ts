// backend/src/routes/users.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { UserController } from '../controllers/UserController' // [V2.0]

export async function userRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  const userResponseSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email(),
    cargo: z.nativeEnum(Cargo),
    matricula: z.string().nullable().optional(),
    ativo: z.boolean(),
  })

  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { await reply.status(401).send({ message: 'Token inválido ou expirado.' }) }
  })

  // 1. CRIAR USUÁRIO
  server.post('/users', {
    schema: {
      tags: ['Usuários'],
      summary: 'Cadastrar novo servidor',
      security: [{ bearerAuth: [] }],
      body: z.object({
        nome: z.string().min(3),
        email: z.string().email(),
        matricula: z.string().optional(),
        cargo: z.string(),
        senhaInicial: z.string().min(6).default('123456')
      }),
      response: { 201: userResponseSchema }
    }
  }, UserController.create)

  // 2. ALTERAR MINHA SENHA
  server.patch('/users/me/password', {
    schema: {
      tags: ['Usuários'],
      summary: 'Alterar a própria senha',
      security: [{ bearerAuth: [] }],
      body: z.object({ senhaAtual: z.string(), novaSenha: z.string().min(6) }),
      response: { 200: z.object({ message: z.string() }) }
    }
  }, UserController.changePassword)

  // 3. LISTAR USUÁRIOS
  server.get('/users', {
    schema: {
      tags: ['Usuários'],
      security: [{ bearerAuth: [] }],
      querystring: z.object({ cargo: z.string().optional(), active: z.coerce.boolean().optional().default(true) }),
      response: { 200: z.array(userResponseSchema) }
    }
  }, UserController.list)

  // 4. LISTAR AGENTES
  server.get('/users/agents', {
    schema: {
      tags: ['Usuários'],
      security: [{ bearerAuth: [] }],
      response: { 200: z.array(z.object({ id: z.string(), nome: z.string() })) }
    }
  }, UserController.listAgents)

  // 5. LISTAR ESPECIALISTAS COM CARGA
  server.get('/users/specialists', {
    schema: {
      tags: ['Usuários'],
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
  }, UserController.listSpecialists)

  // 6. EDITAR USUÁRIO
  server.put('/users/:id', {
    schema: {
      tags: ['Usuários'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        nome: z.string().min(3).optional(),
        email: z.string().email().optional(),
        matricula: z.string().optional(),
        cargo: z.string().optional(),
      }),
      response: { 200: userResponseSchema }
    }
  }, UserController.update)

  // 7. DESATIVAR USUÁRIO
  server.delete('/users/:id', {
    schema: {
      tags: ['Usuários'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, UserController.deactivate)
}