import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

export async function evolutionRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Evoluções
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ 
      caseId: z.string().uuid() 
    })
    
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().min(1).max(50).default(10)
    })

    const { caseId } = paramsSchema.parse(request.params)
    const { page, pageSize } = querySchema.parse(request.query)
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { 
        agenteAcolhidaId: true, 
        especialistaPAEFIId: true,
        status: true
      }
    })

    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    const isGerente = cargo === Cargo.Gerente
    const isResponsavelAtual = 
      caso.agenteAcolhidaId === userId || 
      caso.especialistaPAEFIId === userId

    const canViewSigilo = isGerente || isResponsavelAtual

    const whereCondition: any = {
      casoId: caseId,
    }

    if (!canViewSigilo) {
      whereCondition.OR = [
        { sigilo: false },
        { autorId: userId }
      ]
    }

    const [evolucoes, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { 
            select: { id: true, nome: true, cargo: true } 
          }
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

  // [POST] Criar Nova Evolução
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    
    const bodySchema = z.object({
      conteudo: z.string().min(5, "A evolução deve ter conteúdo relevante."),
      sigilo: z.boolean().optional().default(false)
    })

    const { conteudo, sigilo } = bodySchema.parse(request.body)
    const { sub: userId } = request.user as { sub: string }

    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })

    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo 
          ? 'Registrou uma evolução técnica (SIGILOSA).' 
          : 'Registrou uma evolução técnica pública.'
      }
    })

    return reply.status(201).send(evolucao)
  })

  // --- NOVAS ROTAS QUE FALTAVAM ---

  // [PATCH] Editar Evolução (Apenas Autor)
  app.patch('/evolutions/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      conteudo: z.string().min(5, "Conteúdo muito curto.").optional(),
      sigilo: z.boolean().optional()
    })

    const { id } = paramsSchema.parse(request.params)
    const { conteudo, sigilo } = bodySchema.parse(request.body)
    const { sub: userId } = request.user as { sub: string }

    // Verifica existência
    const existingEvolucao = await prisma.evolucao.findUnique({
      where: { id }
    })

    if (!existingEvolucao) return reply.status(404).send({ message: 'Evolução não encontrada.' })

    // TRAVA DE SEGURANÇA: Apenas o autor edita
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: 'Você só pode editar evoluções criadas por você.' })
    }

    const updated = await prisma.evolucao.update({
      where: { id },
      data: {
        conteudo,
        sigilo
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })

    return reply.send(updated)
  })

  // [DELETE] Excluir Evolução (Apenas Autor)
  app.delete('/evolutions/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const { sub: userId } = request.user as { sub: string }

    const existingEvolucao = await prisma.evolucao.findUnique({ where: { id } })

    if (!existingEvolucao) return reply.status(404).send({ message: 'Evolução não encontrada.' })

    // TRAVA DE SEGURANÇA: Apenas o autor exclui
    if (existingEvolucao.autorId !== userId) {
      return reply.status(403).send({ message: 'Você só pode excluir evoluções criadas por você.' })
    }

    await prisma.evolucao.delete({ where: { id } })

    return reply.status(204).send() // No Content
  })
}