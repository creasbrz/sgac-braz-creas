// backend/src/routes/auth.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { AuthService } from '../services/AuthService'

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // --- Schemas ---
  
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

  // [POST] Registro
  server.post('/register', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Registrar um novo usuário no sistema',
      body: z.object({
        nome: z.string().min(3, 'Nome muito curto'),
        email: z.string().email('E-mail inválido'),
        senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        // Aceita string do Enum ou tenta mapear strings soltas se necessário
        cargo: z.nativeEnum(Cargo).or(
            z.string().transform((val) => {
                if (val === 'Agente Social') return Cargo.Agente_Social
                return val as Cargo
            })
        ),
        matricula: z.string().optional()
      }),
      response: {
        201: userResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      // Service cuida do hash e criação
      const user = await AuthService.register(request.body)
      return reply.status(201).send(user)
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.status(409).send({ message: 'Email já registrado.' })
      }
      throw error // Erro 500 genérico capturado pelo Global Handler
    }
  })

  // [POST] Login
  server.post('/login', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Autenticar usuário e obter token JWT',
      body: z.object({
        email: z.string().email(),
        senha: z.string()
      }),
      response: {
        200: z.object({
          token: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { email, senha } = request.body

    // Service valida senha e status (ativo/inativo)
    const user = await AuthService.validateCredentials(email, senha)
    
    // Mensagem genérica por segurança
    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas ou usuário desativado.' })
    }

    // Geração do Token JWT (Responsabilidade do Controller/Fastify)
    const token = app.jwt.sign(
      { nome: user.nome, cargo: user.cargo, email: user.email },
      { sub: user.id, expiresIn: '7d' }
    )

    return reply.status(200).send({ token })
  })

  // [GET] Dados do Usuário (/me)
  server.get('/me', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['Autenticação'],
      summary: 'Obter dados do usuário logado',
      security: [{ bearerAuth: [] }],
      response: {
        200: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const userId = request.user.sub
    const user = await AuthService.getUserProfile(userId)

    if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })
    if (!user.ativo) return reply.status(401).send({ message: 'Usuário desativado.' })

    return reply.send(user)
  })
}