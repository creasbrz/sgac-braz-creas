// backend/src/controllers/AuthController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from '../services/AuthService'
import { Cargo } from '@prisma/client'

// Interfaces de Body para Tipagem
interface LoginBody {
  email: string
  senha: string
}

interface RegisterBody {
  nome: string
  email: string
  senha: string
  cargo: Cargo | string
  matricula?: string
}

export class AuthController {
  
  static async login(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { email, senha } = req.body

    const user = await AuthService.validateCredentials(email, senha)
    
    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas ou usuário desativado.' })
    }

    // Geração do Token (Lógica de apresentação/infra fica no Controller)
    const token = await reply.jwtSign(
      { nome: user.nome, cargo: user.cargo, email: user.email },
      { sub: user.id, expiresIn: '7d' }
    )

    return reply.status(200).send({ token })
  }

  static async register(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    try {
      // Normalização do cargo (caso venha string solta)
      const cargo = req.body.cargo === 'Agente Social' ? Cargo.Agente_Social : req.body.cargo as Cargo

      const user = await AuthService.register({
        ...req.body,
        cargo
      })
      
      return reply.status(201).send(user)
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.status(409).send({ message: 'Email já registrado.' })
      }
      throw error
    }
  }

  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    // [CORREÇÃO] Tipagem explícita do objeto req.user
    const { sub: userId } = req.user as { sub: string }
    
    const user = await AuthService.getUserProfile(userId)

    if (!user) return reply.status(404).send({ message: 'Usuário não encontrado.' })
    if (!user.ativo) return reply.status(401).send({ message: 'Usuário desativado.' })

    return reply.send(user)
  }
}