import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { Cargo, LogAction } from '@prisma/client'

export async function auditRoutes(app: FastifyInstance) {
  
  // Middleware de Segurança: Apenas GERENTES acessam logs globais
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: Cargo }
      
      if (cargo !== 'Gerente') {
        return reply.status(403).send({ message: 'Acesso restrito à gestão.' })
      }
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [GET] /audit - Listagem Avançada de Logs
  app.get('/audit', async (request, reply) => {
    const querySchema = z.object({
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
      search: z.string().optional(),     // Busca textual
      autorId: z.string().optional(),    // Filtro por Técnico
      acao: z.nativeEnum(LogAction).optional(), // Filtro por Tipo de Ação
      periodo: z.enum(['hoje', '7dias', '30dias', 'todo']).default('7dias'),
    })

    const { page, pageSize, search, autorId, acao, periodo } = querySchema.parse(request.query)

    // Construção Dinâmica do WHERE
    const where: any = {}

    // 1. Filtro de Texto (Busca em Autor, Caso ou Descrição)
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
    // 'todo' não adiciona filtro de data

    try {
      // Executa Count e FindMany em paralelo
      const [total, items] = await Promise.all([
        prisma.caseLog.count({ where }),
        prisma.caseLog.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            autor: { select: { nome: true, cargo: true, email: true } },
            caso: { select: { id: true, nomeCompleto: true } }
          }
        })
      ])

      // [CORREÇÃO] Retorna 'items' diretamente para preservar a estrutura de objetos (autor.nome)
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

  // [GET] /audit/stats - Estatísticas Rápidas para Dashboards
  app.get('/audit/stats', async (request, reply) => {
    // Exemplo: Quantidade de ações hoje
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