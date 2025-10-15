// backend/src/routes/auth.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance) {
  // Rota de Registo de Utilizador
  app.post('/register', async (request, reply) => {
    const registerBodySchema = z.object({
      nome: z.string(),
      email: z.string().email(),
      senha: z.string().min(6),
      cargo: z.enum(['Gerente', 'Agente Social', 'Especialista']),
    })

    try {
      const { nome, email, senha, cargo } = registerBodySchema.parse(
        request.body,
      )

      const userExists = await prisma.user.findUnique({ where: { email } })
      if (userExists) {
        return await reply.status(409).send({ message: 'Email já registado.' })
      }

      const hashedPassword = await bcrypt.hash(senha, 8)

      const user = await prisma.user.create({
        data: { nome, email, senha: hashedPassword, cargo },
      })

      return await reply.status(201).send({
        message: 'Utilizador criado com sucesso!',
        user: { id: user.id, nome: user.nome, email: user.email },
      })
    } catch (error) {
      request.log.error(error, 'Erro ao registar utilizador')
      return await reply
        .status(500)
        .send({ message: 'Erro interno do servidor.' })
    }
  })

  // Rota de Login
  app.post('/login', async (request, reply) => {
    const loginBodySchema = z.object({
      email: z.string().email('Email inválido.'),
      senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    })

    try {
      const { email, senha } = loginBodySchema.parse(request.body)
      const user = await prisma.user.findUnique({ where: { email } })

      if (!user) {
        return await reply
          .status(401)
          .send({ message: 'Credenciais inválidas.' })
      }

      const isPasswordCorrect = await bcrypt.compare(senha, user.senha)

      if (!isPasswordCorrect) {
        return await reply
          .status(401)
          .send({ message: 'Credenciais inválidas.' })
      }

      const token = app.jwt.sign(
        {
          nome: user.nome,
          cargo: user.cargo,
        },
        {
          sub: user.id,
          expiresIn: '7d', // Token expira em 7 dias
        },
      )

      return await reply.status(200).send({ token })
    } catch (error) {
      request.log.error(error, 'Erro no processo de login')
      return await reply
        .status(500)
        .send({ message: 'Ocorreu um erro inesperado no servidor.' })
    }
  })

  // Rota para buscar dados do utilizador logado
  app.get(
    '/me',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
        },
      })

      if (!user) {
        return await reply.status(404).send({ message: 'Utilizador não encontrado.' })
      }

      return await reply.status(200).send(user)
    },
  )
}

