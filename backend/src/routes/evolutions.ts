// backend/src/routes/evolutions.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

// --- Schemas Reutilizáveis ---

const authorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  cargo: z.nativeEnum(Cargo)
})

const evolutionResponseSchema = z.object({
  id: z.string().uuid(),
  conteudo: z.string(),
  sigilo: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  autorId: z.string(),
  autor: authorSchema
})

export async function evolutionRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Autenticação
  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. [GET] Listar Evoluções de um Caso
  server.get('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Listar histórico de evoluções de um caso',
      params: z.object({ caseId: z.string().uuid() }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(50).default(10)
      }),
      response: {
        200: z.object({
          items: z.array(evolutionResponseSchema),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const { page, pageSize } = request.query
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    // 1. Busca dados mínimos do caso para checar permissão
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { 
        agenteAcolhidaId: true, 
        especialistaPAEFIId: true,
      }
    })

    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    // 2. Lógica de Permissão de Visualização (Sigilo)
    const isGerente = cargo === Cargo.Gerente
    const isResponsavel = caso.agenteAcolhidaId === userId || caso.especialistaPAEFIId === userId
    const canViewSigilo = isGerente || isResponsavel

    // [CORREÇÃO] Mapeamento explícito: banco (casoId) <- variável (caseId)
    const whereCondition: any = { casoId: caseId }

    if (!canViewSigilo) {
      // Se não for gerente nem responsável, vê apenas:
      // 1. Evoluções Públicas (sigilo: false)
      // 2. OU Evoluções que ele mesmo escreveu (autorId: userId)
      whereCondition.OR = [
        { sigilo: false },
        { autorId: userId }
      ]
    }

    // 3. Executa Query Otimizada
    const [evolucoes, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      }),
      prisma.evolucao.count({ where: whereCondition })
    ])

    return reply.send({
      items: evolucoes,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    })
  })

  // 2. [POST] Criar Nova Evolução
  server.post('/cases/:caseId/evolutions', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Adicionar nova evolução ao prontuário',
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5, "A evolução deve ter conteúdo relevante."),
        sigilo: z.boolean().default(false)
      }),
      response: {
        201: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const { conteudo, sigilo } = request.body
    const { sub: userId } = request.user as { sub: string }

    // Cria a evolução
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })

    // Gera log de auditoria
    prisma.caseLog.create({
      data: {
        // [CORREÇÃO] Mapeamento explícito
        casoId: caseId,
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo 
          ? 'Registrou uma evolução técnica (SIGILOSA).' 
          : 'Registrou uma evolução técnica pública.'
      }
    }).catch(err => console.error('Erro ao criar log de evolução:', err))

    return reply.status(201).send(evolucao)
  })

  // 3. [PATCH] Editar Evolução
  server.patch('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Editar conteúdo de uma evolução (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        conteudo: z.string().min(5).optional(),
        sigilo: z.boolean().optional()
      }),
      response: {
        200: evolutionResponseSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { conteudo, sigilo } = request.body
    const { sub: userId } = request.user as { sub: string }

    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } })

    if (!existingEvolucao) return reply.status(404).send({ message: 'Evolução não encontrada.' })

    // Validação de Autoria
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: 'Você só pode editar evoluções criadas por você.' })
    }

    const updated = await prisma.evolucao.update({
      where: { id },
      data: { conteudo, sigilo },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })

    return reply.send(updated)
  })

  // 4. [DELETE] Excluir Evolução
  server.delete('/evolutions/:id', {
    schema: {
      tags: ['Evoluções'],
      summary: 'Remover uma evolução (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { sub: userId } = request.user as { sub: string }

    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } })

    if (!existingEvolucao) return reply.status(404).send({ message: 'Evolução não encontrada.' })

    // Validação de Autoria
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: 'Você só pode excluir evoluções criadas por você.' })
    }

    await prisma.evolucao.delete({ where: { id } })

    return reply.status(204).send()
  })
}