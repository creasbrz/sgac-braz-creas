// backend/src/routes/audit.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { Cargo, LogAction } from '@prisma/client'

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
  }).nullable().optional() // Pode ser null se o caso foi deletado fisicamente (raro) ou log de sistema
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
    const { page, pageSize, search, autorId, acao, periodo } = request.query

    // Construção Dinâmica do WHERE
    const where: any = {}

    // 1. Filtro de Texto
    if (search) {
      where.OR = [
        { descricao: { contains: search, mode: 'insensitive' } },
        { autor: { nome: { contains: search, mode: 'insensitive' } } },
        { caso: { nomeCompleto: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // 2. Filtros Específicos
    if (autorId && autorId !== 'all') where.autorId = autorId
    if (acao) where.acao = acao

    // 3. Filtro de Data
    const hoje = new Date()
    if (periodo === 'hoje') {
      where.createdAt = { gte: startOfDay(hoje), lte: endOfDay(hoje) }
    } else if (periodo === '7dias') {
      where.createdAt = { gte: startOfDay(subDays(hoje, 7)) }
    } else if (periodo === '30dias') {
      where.createdAt = { gte: startOfDay(subDays(hoje, 30)) }
    }

    try {
      const [total, items] = await Promise.all([
        prisma.caseLog.count({ where }),
        prisma.caseLog.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { createdAt: 'desc' },
          // SELECT Otimizado
          select: {
            id: true,
            acao: true,
            descricao: true,
            createdAt: true,
            valorAnterior: true,
            valorNovo: true,
            autor: { 
              select: { nome: true, cargo: true, email: true } 
            },
            caso: { 
              select: { id: true, nomeCompleto: true } 
            }
          }
        })
      ])

      return reply.send({
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      })

    } catch (error) {
      console.error('Erro na auditoria:', error)
      return reply.status(500).send({ message: 'Erro ao processar logs de auditoria.' })
    }
  })

  // 2. [GET] Estatísticas Rápidas (Audit Dashboard)
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
    const todayStart = startOfDay(new Date())
    
    const stats = await prisma.caseLog.groupBy({
      by: ['acao'],
      where: {
        createdAt: { gte: todayStart }
      },
      _count: {
        _all: true
      }
    })

    return reply.send(stats)
  })
}