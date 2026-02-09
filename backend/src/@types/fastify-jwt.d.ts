// backend/src/@types/fastify-jwt.d.ts
import '@fastify/jwt'
import { Cargo } from '@prisma/client' // Importa seu Enum do Prisma

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      nome: string
      cargo: Cargo
      iat: number
      exp: number
    }
    // O objeto 'user' disponível em req.user após o jwtVerify
    user: {
      sub: string
      nome: string
      cargo: Cargo
    }
  }
}