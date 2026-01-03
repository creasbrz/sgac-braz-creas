// backend/src/routes/users.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo } from '@prisma/client' // Importa o Enum gerado pelo Prisma
import bcrypt from 'bcryptjs'

export async function userRoutes(app: FastifyInstance) {
  
  // Middleware Global de Autenticação para este arquivo
  // Nenhuma rota aqui funcionará se não tiver token válido
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [NOVO] CRIAR USUÁRIO (Apenas Gerente)
  app.post('/users', async (request, reply) => {
    // Verificação de permissão
    const { cargo } = request.user as { cargo: string }
    
    // Converte string para Enum para comparação segura
    const userRole = cargo === 'Agente Social' ? Cargo.Agente_Social : cargo as Cargo;

    if (userRole !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Apenas gerentes podem cadastrar novos servidores.' })
    }

    // Schema de validação
    const schema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      matricula: z.string().optional(),
      cargo: z.nativeEnum(Cargo), // Espera: 'Gerente', 'Agente_Social', 'Especialista'
      senhaInicial: z.string().min(6).default('123456')
    })

    try {
      // Adapter para compatibilidade com Frontend legado (se enviar com espaço)
      const rawBody = request.body as any;
      if (rawBody.cargo === 'Agente Social') rawBody.cargo = Cargo.Agente_Social;

      const data = schema.parse(rawBody)

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

      // Remove a senha do retorno
      // @ts-ignore
      const { senha, ...userSafe } = user
      return reply.status(201).send(userSafe)

    } catch (error) {
      console.error(error)
      return reply.status(400).send({ message: 'Erro ao criar usuário.', error })
    }
  })

  // 2. [NOVO] ALTERAR MINHA SENHA (Qualquer usuário logado)
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

      // Verifica senha antiga
      let isPasswordValid = false;
      try {
         isPasswordValid = await bcrypt.compare(senhaAtual, user.senha)
      } catch (e) { isPasswordValid = false }

      // Fallback para senha texto plano (legado)
      if (!isPasswordValid && senhaAtual === user.senha) {
         isPasswordValid = true;
      }

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

  // 3. LISTAR TODOS (Apenas Gerente vê a lista completa para gestão)
  app.get('/users', async (request, reply) => {
    const { sub: userId, cargo } = request.user as { sub: string; cargo: string }
    const userRole = cargo === 'Agente Social' ? Cargo.Agente_Social : cargo as Cargo;

    if (userRole !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId }, // Não lista a si mesmo
          ativo: true,
        },
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          email: true,
          cargo: true,
          matricula: true,
          ativo: true,
        },
      })
      return reply.status(200).send(users)
    } catch (error) {
      console.error('Erro ao listar usuários:', error)
      return reply.status(500).send({ message: 'Erro interno no servidor.' })
    }
  })

  // 4. LISTAR AGENTES (Público autenticado - para selects de formulários)
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
      return reply.status(500).send({ message: 'Erro interno.' })
    }
  })

  // 5. LISTAR ESPECIALISTAS (Público autenticado - para selects de formulários)
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
      return reply.status(500).send({ message: 'Erro interno.' })
    }
  })

  // 6. EDITAR USUÁRIO (Apenas Gerente)
  app.put('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    const userRole = cargo === 'Agente Social' ? Cargo.Agente_Social : cargo as Cargo;

    if (userRole !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      cargo: z.nativeEnum(Cargo),
      matricula: z.string().optional(),
    })

    try {
      const { id } = paramsSchema.parse(request.params)
      const rawData = request.body as any
      
      // Adapter: Tratamento de compatibilidade para frontend legado
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

  // 7. DESATIVAR USUÁRIO (Soft Delete - Apenas Gerente)
  app.delete('/users/:id', async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    const userRole = cargo === 'Agente Social' ? Cargo.Agente_Social : cargo as Cargo;

    if (userRole !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }

    const paramsSchema = z.object({ id: z.string().uuid() })

    try {
      const { id } = paramsSchema.parse(request.params)

      // Impede auto-exclusão (opcional, mas recomendado)
      // const userId = request.user.sub;
      // if (id === userId) return reply.status(400).send({message: "Não pode excluir a si mesmo."})

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