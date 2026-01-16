// backend/src/routes/audit.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo, LogAction } from '@prisma/client'
import { AuditService } from '../services/AuditService'

// --- Schemas ---

const logResponseSchema = z.object({
  id: z.string().uuid(),
  acao: z.nativeEnum(LogAction),
  descricao: z.string(),
  createdAt: z.date(),
  valorAnterior: z.string().nullable(),
  valorNovo: z.string().nullable(),
  autor: z.object({
    nome: z.string(),
    cargo: z.string(),
    email: z.string()
  }),
  caso: z.object({
    id: z.string(),
    nomeCompleto: z.string()
  }).nullable().optional()
})

const auditQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
  search: z.string().optional(),
  autorId: z.string().optional(),
  acao: z.nativeEnum(LogAction).optional(),
  periodo: z.enum(['hoje', '7dias', '30dias', 'todo']).default('7dias'),
})

export async function auditRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware de Segurança: Apenas GERENTES
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: Cargo }
      
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso restrito à gestão.' })
      }
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // 1. [GET] Listagem Avançada de Logs
  server.get('/audit', {
    schema: {
      tags: ['Auditoria'],
      summary: 'Pesquisar logs do sistema (Trilha de Auditoria)',
      querystring: auditQuerySchema,
      response: {
        200: z.object({
          data: z.array(logResponseSchema),
          meta: z.object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
        })
      }
    }
  }, async (request, reply) => {
    const filters = request.query

    try {
      const { total, items } = await AuditService.listLogs(filters)

      return reply.send({
        data: items,
        meta: {
          page: filters.page,
          pageSize: filters.pageSize,
          total,
          totalPages: Math.ceil(total / filters.pageSize)
        }
      })

    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar logs de auditoria.' })
    }
  })

  // 2. [GET] Estatísticas Rápidas
  server.get('/audit/stats', {
    schema: {
      tags: ['Auditoria'],
      summary: 'Resumo de atividades do dia',
      response: {
        200: z.array(z.object({
          acao: z.nativeEnum(LogAction),
          _count: z.object({ _all: z.number() })
        }))
      }
    }
  }, async (request, reply) => {
    const stats = await AuditService.getDailyStats()
    return reply.send(stats)
  })
}