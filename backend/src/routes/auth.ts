// backend/src/routes/auth.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { Cargo } from '@prisma/client'

export async function authRoutes(app: FastifyInstance) {
  // Tipagem forte para garantir inferência do Zod
  const server = app.withTypeProvider<ZodTypeProvider>()

  // --- Schemas Reutilizáveis ---
  // Schema de resposta do usuário (para não vazar senha)
  const userResponseSchema = z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().email(),
    cargo: z.nativeEnum(Cargo),
    matricula: z.string().nullable().optional(),
    ativo: z.boolean(),
    createdAt: z.date().optional() // Opcional pois o create retorna, mas o /me pode formatar
  })

  // [POST] Registro
  server.post('/register', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Registrar um novo usuário no sistema',
      body: z.object({
        nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
        email: z.string().email('E-mail inválido'),
        senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        // Transformação para lidar com possíveis inputs legados ou do frontend
        cargo: z.string().transform((val) => {
          if (val === 'Agente Social') return Cargo.Agente_Social
          return val as Cargo
        }),
        matricula: z.string().optional()
      }),
      response: {
        201: userResponseSchema // Filtra automaticamente a senha
      }
    }
  }, async (request, reply) => {
    const { nome, email, senha, cargo, matricula } = request.body

    const userExists = await prisma.user.findUnique({ where: { email } })
    if (userExists) {
      return reply.status(409).send({ message: 'Email já registrado.' })
    }

    const hashedPassword = await bcrypt.hash(senha, 10) // Aumentei salt para 10 (padrão de segurança atual)

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cargo,
        matricula,
        ativo: true
      },
    })

    return reply.status(201).send(user)
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

    const user = await prisma.user.findUnique({ where: { email } })
    
    // Boa prática de segurança: Mensagem genérica para dificultar enumeração de usuários
    if (!user || !user.ativo) {
      return reply.status(401).send({ message: 'Credenciais inválidas ou usuário desativado.' })
    }

    const isPasswordCorrect = await bcrypt.compare(senha, user.senha)
    if (!isPasswordCorrect) {
      return reply.status(401).send({ message: 'Credenciais inválidas ou usuário desativado.' })
    }

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
      security: [{ bearerAuth: [] }], // Adiciona o cadeado no Swagger
      response: {
        200: userResponseSchema
      }
    }
  }, async (request, reply) => {
    const userId = request.user.sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      // Não precisamos de 'select' manual aqui, pois o userResponseSchema já filtra a senha na saída
    })

    if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })
    if (!user.ativo) return reply.status(401).send({ message: 'Usuário desativado.' })

    return reply.send(user)
  })
}