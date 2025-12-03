// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

export async function evolutionRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Evoluções (Com filtro de Sigilo)
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }
    
    const evolucoes = await prisma.evolucao.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        autor: { select: { id: true, nome: true, cargo: true } }
      }
    })

    // FILTRO DE SEGURANÇA v3.3
    // Se for sigiloso, só mostra se eu for o autor OU se eu for Gerente
    const filteredEvolucoes = evolucoes.filter(evo => {
      if (!evo.sigilo) return true
      if (cargo === Cargo.Gerente) return true
      if (evo.autorId === userId) return true
      return false
    })

    return reply.send(filteredEvolucoes)
  })

  // [POST] Criar Nova Evolução (Com suporte a Sigilo)
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(request.params)
    
    const bodySchema = z.object({
      conteudo: z.string().min(1),
      sigilo: z.boolean().optional().default(false) // [NOVO]
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
      include: { autor: true }
    })

    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        // Se for sigiloso, não mostra detalhes no log público
        descricao: sigilo 
          ? 'Registrou uma evolução SIGILOSA.' 
          : 'Adicionou uma nova evolução técnica.'
      }
    })

    return reply.status(201).send(evolucao)
  })
}