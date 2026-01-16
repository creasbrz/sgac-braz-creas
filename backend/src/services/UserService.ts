// backend/src/services/UserService.ts
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

interface CreateUserInput {
  nome: string
  email: string
  matricula?: string
  cargo: Cargo
  senhaInicial: string
}

interface UpdateUserInput {
  id: string
  nome?: string
  email?: string
  matricula?: string
  cargo?: Cargo
}

export class UserService {

  // --- CRUD BÁSICO ---

  static async create({ nome, email, matricula, cargo, senhaInicial }: CreateUserInput) {
    const userExists = await prisma.user.findUnique({ where: { email } })
    if (userExists) throw new Error('EMAIL_ALREADY_EXISTS')

    const passwordHash = await bcrypt.hash(senhaInicial, 10)

    return prisma.user.create({
      data: {
        nome,
        email,
        matricula,
        cargo,
        senha: passwordHash,
        ativo: true
      }
    })
  }

  static async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data
    })
  }

  static async deactivate(id: string) {
    return prisma.user.update({
      where: { id },
      data: { ativo: false }
    })
  }

  // --- SEGURANÇA ---

  static async changePassword(userId: string, senhaAtual: string, novaSenha: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('NOT_FOUND')

    const isPasswordValid = await bcrypt.compare(senhaAtual, user.senha)
    if (!isPasswordValid) throw new Error('INVALID_PASSWORD')

    const newPasswordHash = await bcrypt.hash(novaSenha, 10)
    
    await prisma.user.update({ 
      where: { id: userId }, 
      data: { senha: newPasswordHash } 
    })
    
    return true
  }

  // --- LISTAGENS E REGRAS DE NEGÓCIO ---

  static async listAll(currentUserId: string, cargo?: Cargo, active: boolean = true) {
    return prisma.user.findMany({
      where: { 
        id: { not: currentUserId }, 
        ativo: active, 
        ...(cargo ? { cargo } : {}) 
      },
      orderBy: { nome: 'asc' },
    })
  }

  static async listAgents() {
    return prisma.user.findMany({
      where: { cargo: Cargo.Agente_Social, ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    })
  }

  /**
   * Lista especialistas com a contagem de carga de trabalho atual (Casos ativos)
   * Útil para o gerente decidir para quem atribuir um novo caso (Load Balancing)
   */
  static async listSpecialistsWithLoad() {
    // 1. Busca especialistas ativos
    const users = await prisma.user.findMany({
      where: { ativo: true, cargo: Cargo.Especialista },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cargo: true }
    })

    // 2. Calcula carga de trabalho (Query N+1 otimizada com Promise.all)
    // Nota: Poderíamos usar include: { _count: ... } se a relação estiver direta,
    // mas a lógica de "status != DESLIGADO" exige filtro no count.
    const results = await Promise.all(users.map(async (u) => {
      const count = await prisma.case.count({
          where: { 
              especialistaPAEFIId: u.id,
              status: { not: CaseStatus.DESLIGADO }
          }
      })

      return {
          id: u.id,
          nome: u.nome,
          cargo: u.cargo,
          activeCases: count
      }
    }))

    return results
  }
}