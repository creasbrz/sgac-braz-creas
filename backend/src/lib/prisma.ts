// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Definição de tipo para o objeto global
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Se já existir uma instância no global (dev), usa ela. Se não, cria uma nova.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Habilite logs apenas se quiser debugar queries lentas ou erros
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Em desenvolvimento, salva a instância no global para reuso
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma