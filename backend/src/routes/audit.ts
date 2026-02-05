// backend/src/routes/audit.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { LogAction } from '@prisma/client'
import { AuditController } from '../controllers/AuditController'

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
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/audit', {
    schema: {
      tags: ['Auditoria'],
      summary: 'Pesquisar logs do sistema (Apenas Gerentes)',
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
  }, AuditController.list)

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
  }, AuditController.getStats)
}