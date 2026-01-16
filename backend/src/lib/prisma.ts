// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Tipagem para o objeto global extendido para evitar erros de TS no global
const globalForPrisma = global as unknown as { prisma: PrismaClient }

/**
 * Configuração de Logs Otimizada:
 * - Em DEV: 'query' (para debug de performance), 'info', 'warn', 'error'.
 * - Em PROD: Apenas 'warn' e 'error' para reduzir ruído e custos de ingestão de logs no Render.
 */
const logConfig: any[] = process.env.NODE_ENV === 'production' 
  ? ['error', 'warn'] 
  : ['query', 'error', 'warn', 'info']

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logConfig,
    // Nota Arquitetural: 
    // Em arquiteturas Serverless (Neon), o controle de conexões deve ser feito 
    // preferencialmente via Connection String (parametro ?pgbouncer=true) no .env
  })

// Singleton Pattern: Previne exaustão de conexões com o Neon durante Hot Reload em desenvolvimento
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma