// backend/src/controllers/UserController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { UserService } from '../services/UserService'
import { Cargo } from '@prisma/client'

// Interfaces de Body
interface CreateUserBody {
  nome: string
  email: string
  matricula?: string
  cargo: string
  senhaInicial: string
}

interface UpdateUserBody {
  nome?: string
  email?: string
  matricula?: string
  cargo?: string
}

interface ChangePasswordBody {
  senhaAtual: string
  novaSenha: string
}

export class UserController {

  static async create(req: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) {
    const { cargo: userCargo } = req.user as { cargo: string }
    if (userCargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito.' })

    try {
      // Normalização de cargo
      const normalizedCargo = req.body.cargo === 'Agente Social' ? Cargo.Agente_Social : req.body.cargo as Cargo
      
      const user = await UserService.create({ ...req.body, cargo: normalizedCargo })
      return reply.status(201).send(user)
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') return reply.status(409).send({ message: 'E-mail já cadastrado.' })
      throw error
    }
  }

  static async list(req: FastifyRequest<{ Querystring: { cargo?: string, active?: boolean } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    const { cargo, active } = req.query
    
    let cargoFilter: Cargo | undefined
    if (cargo) {
       if (cargo === 'Agente Social') cargoFilter = Cargo.Agente_Social
       else if (Object.values(Cargo).includes(cargo as Cargo)) cargoFilter = cargo as Cargo
    }

    const users = await UserService.listAll(userId, cargoFilter, active)
    return reply.send(users)
  }

  static async listAgents(req: FastifyRequest, reply: FastifyReply) {
    const agents = await UserService.listAgents()
    return reply.send(agents)
  }

  static async listSpecialists(req: FastifyRequest, reply: FastifyReply) {
    try {
      const results = await UserService.listSpecialistsWithLoad()
      return reply.send(results)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: "Erro interno ao buscar equipe." })
    }
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: UpdateUserBody }>, reply: FastifyReply) {
    const { cargo: requestCargo } = req.user as { cargo: string }
    if (requestCargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    // Normalização opcional se vier cargo no update
    const data = { ...req.body }
    if (data.cargo && data.cargo === 'Agente Social') data.cargo = Cargo.Agente_Social

    const updatedUser = await UserService.update(req.params.id, data as any)
    return reply.send(updatedUser)
  }

  static async deactivate(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { cargo } = req.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    await UserService.deactivate(req.params.id)
    return reply.status(204).send()
  }

  static async changePassword(req: FastifyRequest<{ Body: ChangePasswordBody }>, reply: FastifyReply) {
    const { senhaAtual, novaSenha } = req.body
    const userId = (req.user as any).sub

    try {
      await UserService.changePassword(userId, senhaAtual, novaSenha)
      return reply.send({ message: 'Senha alterada com sucesso!' })
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Usuário não encontrado.' })
      if (error.message === 'INVALID_PASSWORD') return reply.status(400).send({ message: 'Senha atual incorreta.' })
      throw error
    }
  }
}