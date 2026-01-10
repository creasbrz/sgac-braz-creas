// backend/src/routes/deliverables.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

const deliverableResponseSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  status: z.string(),
  dataSolicitacao: z.date(),
  dataEntrega: z.date().nullable(),
  responsavel: z.object({ nome: z.string() })
})

export async function deliverablesRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [GET] Listar
  server.get('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(deliverableResponseSchema) }
    }
  }, async (req, reply) => {
    const { caseId } = req.params

    const items = await prisma.serviceDeliverable.findMany({
      // CORREÇÃO: Mapeando explicitamente 'casoId' do banco para 'caseId' da rota
      where: { casoId: caseId }, 
      orderBy: { createdAt: 'desc' },
      include: { 
        responsavel: { select: { nome: true } } 
      }
    })

    return reply.send(items)
  })

  // [POST] Criar
  server.post('/cases/:caseId/deliverables', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        tipo: z.string().min(3),
        observacoes: z.string().optional()
      })
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const { tipo, observacoes } = req.body
    const userId = (req.user as any).sub

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.create({
        data: {
          tipo,
          status: 'SOLICITADO',
          observacoes,
          // CORREÇÃO: Mapeando explicitamente
          casoId: caseId,
          responsavelId: userId
        }
      })

      await tx.caseLog.create({
        data: {
          casoId: caseId, // CORREÇÃO
          autorId: userId,
          acao: LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Solicitou benefício: ${tipo}`
        }
      })
      
      return item
    })

    return reply.status(201).send(result)
  })

  // [PATCH] Atualizar Status
  server.patch('/deliverables/:id', {
    schema: {
      tags: ['Benefícios'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE', 'NEGADO']),
        dataEntrega: z.string().datetime().optional()
      })
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { status, dataEntrega } = req.body
    const userId = (req.user as any).sub

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined
        },
        include: { responsavel: { select: { nome: true } } }
      })

      await tx.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
          descricao: `Atualizou benefício ${item.tipo} para ${status}`
        }
      })

      return item
    })

    return reply.send(updated)
  })
}