// backend/src/routes/deliverables.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function deliverableRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Entregas de um Caso
  app.get('/cases/:caseId/deliverables', async (req, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)
    
    const items = await prisma.serviceDeliverable.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: 'desc' },
      include: { responsavel: { select: { nome: true } } }
    })
    
    return reply.send(items)
  })

  // [POST] Criar Nova Entrega (Benefício)
  app.post('/cases/:caseId/deliverables', async (req, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)
    const bodySchema = z.object({
      tipo: z.string().min(2),
      status: z.enum(['SOLICITADO', 'CONCEDIDO', 'NEGADO', 'ENTREGUE']).default('SOLICITADO'),
      observacoes: z.string().optional()
    })

    const { tipo, status, observacoes } = bodySchema.parse(req.body)
    const userId = (req.user as any).sub

    const item = await prisma.serviceDeliverable.create({
      data: {
        tipo,
        status,
        observacoes,
        casoId,
        responsavelId: userId,
        dataSolicitacao: new Date()
      }
    })

    await prisma.caseLog.create({
      data: {
        casoId,
        autorId: userId,
        acao: LogAction.ENTREGA_BENEFICIO_CRIADA,
        descricao: `Registrou entrega/benefício: ${tipo} (${status})`
      }
    })

    return reply.status(201).send(item)
  })

  // [PATCH] Atualizar Status da Entrega
  app.patch('/deliverables/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const bodySchema = z.object({
      status: z.enum(['SOLICITADO', 'CONCEDIDO', 'NEGADO', 'ENTREGUE']),
      dataEntrega: z.string().optional(), // ISO String
      observacoes: z.string().optional()
    })

    const { status, dataEntrega, observacoes } = bodySchema.parse(req.body)
    const userId = (req.user as any).sub

    const oldItem = await prisma.serviceDeliverable.findUnique({ where: { id } })
    if (!oldItem) return reply.status(404).send()

    const updated = await prisma.serviceDeliverable.update({
      where: { id },
      data: {
        status,
        observacoes,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined,
        updatedAt: new Date()
      }
    })

    await prisma.caseLog.create({
      data: {
        casoId: oldItem.casoId,
        autorId: userId,
        acao: LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
        descricao: `Atualizou benefício ${oldItem.tipo} para ${status}`
      }
    })

    return reply.send(updated)
  })

  // [DELETE] Remover Entrega
  app.delete('/deliverables/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    await prisma.serviceDeliverable.delete({ where: { id } })
    return reply.status(204).send()
  })
}