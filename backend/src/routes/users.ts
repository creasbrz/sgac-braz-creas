// backend/src/routes/users.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function userRoutes(app: FastifyInstance) {
  
  // Middleware Global de Autenticação
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [NOVO] CRIAR USUÁRIO (Gerente)
  app.post('/users', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    
    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Apenas gerentes podem cadastrar novos servidores.' })
    }

    const schema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      matricula: z.string().optional(),
      cargo: z.nativeEnum(Cargo), // 'Gerente', 'Agente_Social', 'Especialista'
      senhaInicial: z.string().min(6).default('123456')
    })

    try {
      const data = schema.parse(request.body)

      const userExists = await prisma.user.findUnique({ where: { email: data.email } })
      if (userExists) return reply.status(409).send({ message: 'E-mail já cadastrado.' })

      const passwordHash = await bcrypt.hash(data.senhaInicial, 6)

      const user = await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          matricula: data.matricula,
          cargo: data.cargo,
          senha: passwordHash,
          ativo: true
        }
      })

      const { senha, ...userSafe } = user
      return reply.status(201).send(userSafe)

    } catch (error) {
      console.error(error)
      return reply.status(400).send({ message: 'Erro ao criar usuário.', error })
    }
  })

  // 2. [NOVO] ALTERAR MINHA SENHA
  app.patch('/users/me/password', async (request, reply) => {
    const schema = z.object({
      senhaAtual: z.string(),
      novaSenha: z.string().min(6)
    })

    try {
      const { senhaAtual, novaSenha } = schema.parse(request.body)
      const userId = request.user.sub

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })

      const isPasswordValid = await bcrypt.compare(senhaAtual, user.senha)
      if (!isPasswordValid) {
        return reply.status(400).send({ message: 'A senha atual está incorreta.' })
      }

      const newPasswordHash = await bcrypt.hash(novaSenha, 6)

      await prisma.user.update({
        where: { id: userId },
        data: { senha: newPasswordHash }
      })

      return reply.send({ message: 'Senha alterada com sucesso!' })

    } catch (error) {
      return reply.status(400).send({ message: 'Erro ao alterar senha.' })
    }
  })

  // 3. LISTAR TODOS (Gerente)
  app.get('/users', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string; cargo: string }

    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          ativo: true,
        },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          matricula: true, // Adicionado matricula
          ativo: true,
        },
      })
      return reply.status(200).send(users)
    } catch (error) {
      console.error('Erro ao listar usuários:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 4. LISTAR AGENTES (Para selects)
  app.get('/users/agents', async (request, reply) => {
    try {
      const agents = await prisma.user.findMany({
        where: {
          cargo: Cargo.Agente_Social,
          ativo: true,
        },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      })
      return reply.status(200).send(agents)
    } catch (error) {
      console.error('Erro ao listar Agentes:', error)
      return reply.status(500).send({ message: 'Erro interno.' })
    }
  })

  // 5. LISTAR ESPECIALISTAS (Para selects)
  app.get('/users/specialists', async (request, reply) => {
    try {
      const specialists = await prisma.user.findMany({
        where: {
          cargo: Cargo.Especialista,
          ativo: true,
        },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
      })
      return reply.status(200).send(specialists)
    } catch (error) {
      console.error('Erro ao listar Especialistas:', error)
      return reply.status(500).send({ message: 'Erro interno.' })
    }
  })

  // 6. EDITAR USUÁRIO (Gerente)
  app.put('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      cargo: z.nativeEnum(Cargo),
      matricula: z.string().optional(), // Adicionado suporte a matricula
    })

    try {
      const { id } = paramsSchema.parse(request.params)
      const rawData = request.body as any
      
      // Adapter para tratar strings com espaço caso venha do front antigo
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
          matricula: data.matricula
        },
      })

      // @ts-ignore
      const { senha, ...safeUser } = updatedUser
      return reply.status(200).send(safeUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 7. DESATIVAR USUÁRIO (Gerente)
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
        data: { ativo: false },
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao desativar usuário:', error)
      return reply.status(500).send({ message: 'Erro interno.' })
    }
  })
}