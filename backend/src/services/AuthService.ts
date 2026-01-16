// backend/src/services/AuthService.ts
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import { Cargo, User } from '@prisma/client'

interface RegisterDTO {
  nome: string
  email: string
  senha: string
  cargo: Cargo
  matricula?: string
}

export class AuthService {
  /**
   * Registra um novo usuário com senha hasheada.
   * Lança erro se o email já existir.
   */
  static async register(data: RegisterDTO) {
    const userExists = await prisma.user.findUnique({ where: { email: data.email } })
    
    if (userExists) {
      throw new Error('EMAIL_ALREADY_EXISTS')
    }

    // Salt de 10 rounds é o padrão atual recomendado para segurança/performance
    const hashedPassword = await bcrypt.hash(data.senha, 10)

    const user = await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senha: hashedPassword,
        cargo: data.cargo,
        matricula: data.matricula,
        ativo: true // Padrão: já nasce ativo
      },
    })

    return user
  }

  /**
   * Valida credenciais e status do usuário.
   * Retorna o usuário se sucesso, ou null se falha.
   */
  static async validateCredentials(email: string, senhaPlain: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } })

    // 1. Verifica existência e status
    if (!user || !user.ativo) {
      return null
    }

    // 2. Compara a senha (operação pesada de CPU)
    const isPasswordCorrect = await bcrypt.compare(senhaPlain, user.senha)
    
    if (!isPasswordCorrect) {
      return null
    }

    return user
  }

  /**
   * Busca usuário por ID (para endpoint /me)
   */
  static async getUserProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId }
    })
  }
}