// backend/src/routes/auth.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { Cargo } from '@prisma/client'

export async function authRoutes(app: FastifyInstance) {
  
  // [POST] Registro
  app.post('/register', async (request, reply) => {
    const registerBodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      senha: z.string().min(6),
      cargo: z.string().transform((val) => {
        if (val === 'Agente Social') return Cargo.Agente_Social
        return val as Cargo
      }),
      matricula: z.string().optional()
    })

    try {
      const { nome, email, senha, cargo, matricula } = registerBodySchema.parse(request.body)

      const userExists = await prisma.user.findUnique({ where: { email } })
      if (userExists) return reply.status(409).send({ message: 'Email já registrado.' })

      const hashedPassword = await bcrypt.hash(senha, 8)

      const user = await prisma.user.create({
        data: { nome, email, senha: hashedPassword, cargo, matricula, ativo: true },
      })

      const { senha: _, ...userSafe } = user
      return reply.status(201).send(userSafe)

    } catch (error) {
      return reply.status(400).send({ message: 'Erro no registro', error })
    }
  })

  // [POST] Login
  app.post('/login', async (request, reply) => {
    const loginBodySchema = z.object({ email: z.string().email(), senha: z.string() })

    try {
      const { email, senha } = loginBodySchema.parse(request.body)

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return reply.status(401).send({ message: 'Credenciais inválidas.' })
      
      // Checa se está ativo
      if (!user.ativo) return reply.status(401).send({ message: 'Usuário desativado.' })

      const isPasswordCorrect = await bcrypt.compare(senha, user.senha)
      if (!isPasswordCorrect) return reply.status(401).send({ message: 'Credenciais inválidas.' })

      const token = app.jwt.sign(
        { nome: user.nome, cargo: user.cargo, email: user.email },
        { sub: user.id, expiresIn: '7d' }
      )

      return reply.status(200).send({ token })

    } catch (error) {
      return reply.status(500).send({ message: 'Erro interno no login.' })
    }
  })

  // [GET] Dados do Usuário (/me) - CORRIGIDO
  app.get('/me', { onRequest: [app.authenticate] }, async (request, reply) => {
      const userId = request.user.sub

      // CORREÇÃO: findUnique só aceita o ID no where.
      // Removemos 'ativo: true' daqui.
      const user = await prisma.user.findUnique({
        where: { id: userId }, 
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          matricula: true,
          ativo: true // Selecionamos o campo para checar depois
        }
      })

      if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })
      
      // Validação de segurança extra
      if (!user.ativo) return reply.status(401).send({ message: 'Usuário desativado.' })

      return reply.send(user)
  })
}