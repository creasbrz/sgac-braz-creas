// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Adiciona propriedade ao objeto global do Node para evitar múltiplas instâncias no Hot Reload
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'], // Reduzi logs para limpar o terminal, use ['query'] para debug
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma