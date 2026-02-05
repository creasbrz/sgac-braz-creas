// backend/src/services/FilterService.ts
import { prisma } from '../lib/prisma'

export class FilterService {
  static async listByUser(userId: string) {
    return prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async create(userId: string, nome: string, config: any) {
    const count = await prisma.savedFilter.count({ where: { userId } })
    if (count >= 20) throw new Error('QUOTA_EXCEEDED')

    return prisma.savedFilter.create({
      data: { userId, nome, config }
    })
  }

  static async update(id: string, userId: string, nome?: string, config?: any) {
    const existing = await prisma.savedFilter.findUnique({ where: { id } })
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.userId !== userId) throw new Error('FORBIDDEN')

    return prisma.savedFilter.update({
      where: { id },
      data: { nome, config }
    })
  }

  static async delete(id: string, userId: string) {
    const { count } = await prisma.savedFilter.deleteMany({
      where: { id, userId }
    })
    if (count === 0) throw new Error('NOT_FOUND')
    return true
  }
}