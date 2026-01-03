// backend/src/routes/auth.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance) {
  // Rota de Registro
  app.post('/register', async (request, reply) => {
    const registerBodySchema = z.object({
      nome: z.string(),
      email: z.string().email(),
      senha: z.string().min(6),
      // Ajustado para garantir compatibilidade com o Enum do Prisma se necessário
      cargo: z.enum(['Gerente', 'Agente_Social', 'Especialista', 'Agente Social']), 
    })

    try {
      // Pequeno ajuste para mapear "Agente Social" (frontend) para "Agente_Social" (banco) se necessário
      const rawData = registerBodySchema.parse(request.body)
      const cargoMap: Record<string, any> = {
        'Agente Social': 'Agente_Social', // Mapeamento de segurança
      }
      const cargoFinal = cargoMap[rawData.cargo] || rawData.cargo

      const userExists = await prisma.user.findUnique({ where: { email: rawData.email } })

      if (userExists) {
        return await reply.status(409).send({ message: 'Email já registado.' })
      }

      const hashedPassword = await bcrypt.hash(rawData.senha, 8)

      const user = await prisma.user.create({
        data: {
          nome: rawData.nome,
          email: rawData.email,
          senha: hashedPassword,
          cargo: cargoFinal,
          ativo: true,
        },
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

  // Rota de Login (COM AS CORREÇÕES CRÍTICAS)
  app.post('/login', async (request, reply) => {
    const loginBodySchema = z.object({
      email: z.string().email('Email inválido.'),
      senha: z.string().min(1, 'A senha é obrigatória.'),
    })

    try {
      const { email, senha } = loginBodySchema.parse(request.body)
      
      const user = await prisma.user.findUnique({ where: { email } })

      if (!user) {
        return await reply
          .status(401)
          .send({ message: 'Credenciais inválidas.' })
      }

      if (!user.ativo) {
        return await reply
          .status(403)
          .send({ message: 'Este usuário está desativado.' })
      }

      // --- CORREÇÃO 1: Validação Híbrida (Hash ou Texto Simples) ---
      let isPasswordCorrect = false;

      // 1. Tenta comparar como Hash (Bcrypt)
      try {
        isPasswordCorrect = await bcrypt.compare(senha, user.senha)
      } catch (err) {
        // Ignora erro de hash malformado
      }

      // 2. Fallback: Se falhar o hash, verifica se é senha legada (texto simples)
      if (!isPasswordCorrect && senha === user.senha) {
        console.log(`⚠️ Aviso: Usuário ${email} logou com senha não criptografada.`)
        isPasswordCorrect = true
      }

      if (!isPasswordCorrect) {
        return await reply
          .status(401)
          .send({ message: 'Credenciais inválidas.' })
      }
      // -------------------------------------------------------------

      const token = app.jwt.sign(
        {
          nome: user.nome,
          cargo: user.cargo,
        },
        {
          sub: user.id,
          expiresIn: '7d',
        },
      )

      // --- CORREÇÃO 2: Retornar o objeto 'user' junto com o token ---
      // O Frontend precisa disso para carregar o contexto sem erros
      return await reply.status(200).send({ 
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          ativo: user.ativo
        }
      })

    } catch (error) {
      request.log.error(error, 'Erro no processo de login')
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          message: 'Dados inválidos', 
          errors: error.flatten().fieldErrors 
        })
      }

      return await reply
        .status(500)
        .send({ message: 'Ocorreu um erro inesperado no servidor.' })
    }
  })

  // Rota /me (Mantida igual, apenas garantindo tipagem)
  app.get('/me', { onRequest: [app.authenticate] }, async (request, reply) => {
  const { sub: userId } = request.user as { sub: string }

      const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      ativo: true
    }
  })

      if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })
  return reply.send(user)
    },
  )
}