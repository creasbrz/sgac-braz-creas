// backend/src/routes/auth.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { AuthController } from '../controllers/AuthController'

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Schema de resposta seguro (sem senha)
  const userResponseSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email(),
    cargo: z.nativeEnum(Cargo),
    matricula: z.string().nullable().optional(),
    ativo: z.boolean(),
    createdAt: z.date().optional()
  })

  server.post('/register', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Registrar um novo usuário',
      body: z.object({
        nome: z.string().min(3),
        email: z.string().email(),
        senha: z.string().min(6),
        cargo: z.nativeEnum(Cargo).or(z.string()),
        matricula: z.string().optional()
      }),
      response: { 201: userResponseSchema }
    }
  }, AuthController.register)

  server.post('/login', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Autenticar usuário',
      body: z.object({
        email: z.string().email(),
        senha: z.string()
      }),
      response: {
        200: z.object({ token: z.string() })
      }
    }
  }, AuthController.login)

  server.get('/me', {
    // [CORREÇÃO] Cast para any para o TS aceitar o decorator customizado 'authenticate'
    onRequest: [(app as any).authenticate],
    schema: {
      tags: ['Autenticação'],
      summary: 'Dados do usuário logado',
      security: [{ bearerAuth: [] }],
      response: { 200: userResponseSchema }
    }
  }, AuthController.getProfile)
}