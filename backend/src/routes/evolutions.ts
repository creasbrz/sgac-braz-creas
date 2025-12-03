// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function evolutionRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Evoluções de um Caso
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    
    const evolucoes = await prisma.evolucao.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
      include: {
        autor: { select: { id: true, nome: true, cargo: true } }
      }
    })
    return reply.send(evolucoes)
  })

  // [POST] Criar Nova Evolução
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    const { conteudo } = z.object({ conteudo: z.string().min(1) }).parse(request.body)
    const { sub: userId } = request.user as { sub: string }

    // 1. Criar Evolução
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        casoId: caseId, // Mapeia a variável caseId para o campo casoId do banco
        autorId: userId
      },
      include: { autor: true }
    })

    // 2. Log de Auditoria (Sistema)
    await prisma.caseLog.create({
      data: {
        casoId: caseId, // [CORREÇÃO] Aqui estava apenas 'casoId', que não existia. Agora usa 'caseId'
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        descricao: 'Adicionou uma nova evolução técnica.'
      }
    })

    return reply.status(201).send(evolucao)
  })
}