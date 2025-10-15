// backend/src/lib/prisma.ts

// Importa o PrismaClient da biblioteca instalada
import { PrismaClient } from '@prisma/client';

// Cria e exporta uma instância única do PrismaClient.
// Esta abordagem (singleton) garante que a nossa aplicação não crie
// múltiplas conexões desnecessárias com o banco de dados.
export const prisma = new PrismaClient();

