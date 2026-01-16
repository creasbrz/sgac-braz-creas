import { FastifyError, FastifyReply, FastifyRequest } from "fastify"
import { ZodError } from "zod"

// Classe de Erro Customizada (Opcional, mas útil para lançar erros controlados nos Services)
export class AppError extends Error {
  public readonly statusCode: number
  
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  // 1. Erro de Validação (Zod)
  // O fastify-type-provider-zod lança erros com a propriedade 'validation' ou instância de ZodError
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Erro de validação nos dados enviados.',
      issues: error.format()
    })
  }
  
  // Tratamento legado para o validador padrão do Fastify caso misture schemas
  if (error.validation) {
    return reply.status(400).send({
      message: 'Erro de validação.',
      issues: error.validation
    })
  }

  // 2. Erros de Domínio (Lançados manualmente pelos Services)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message
    })
  }

  // 3. Erros do Prisma
  // P2002: Unique constraint failed (ex: Email/CPF duplicado)
  if (error.code === 'P2002') {
    return reply.status(409).send({ 
      message: 'Conflito: Um registro com este dado único já existe.' 
    })
  }
  
  // P2025: Record not found (quando tenta atualizar/deletar ID inexistente)
  if (error.code === 'P2025') {
    return reply.status(404).send({ message: 'Registro não encontrado.' })
  }

  // 4. Erros de Autenticação (JWT)
  // O plugin @fastify/jwt lança erros com statusCode 401
  if (error.statusCode === 401) {
    return reply.status(401).send({ message: 'Sessão expirada ou token inválido.' })
  }

  // 5. Erro Interno (Genérico) - Loga o erro real e não vaza detalhes para o cliente
  request.log.error(error)
  
  return reply.status(500).send({ 
    message: 'Ocorreu um erro interno no servidor.',
    code: 'INTERNAL_SERVER_ERROR' 
  })
}