// backend/src/routes/deliverables.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

const emptyToNull = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
}

interface UserPayload {
  sub: string
  cargo: Cargo
}

export async function deliverableRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar Entregas
  app.get('/cases/:caseId/deliverables', async (req, reply) => {
    try {
      const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)
      
      const items = await prisma.serviceDeliverable.findMany({
        where: { casoId: caseId }, // Aqui funciona pois caseId é o valor
        orderBy: { dataSolicitacao: 'desc' },
        include: { responsavel: { select: { nome: true } } }
      })
      
      return reply.send(items)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao listar benefícios.' })
    }
  })

  // [POST] Criar Nova Entrega (CORRIGIDO)
  app.post('/cases/:caseId/deliverables', async (req, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    const bodySchema = z.object({
      tipo: z.string().min(2, "Informe o tipo do benefício"),
      status: z.enum(['SOLICITADO', 'CONCEDIDO', 'NEGADO', 'ENTREGUE']).default('SOLICITADO'),
      observacoes: z.preprocess(emptyToNull, z.string().optional().nullable())
    })

    try {
      const { caseId } = paramsSchema.parse(req.params)
      const { tipo, status, observacoes } = bodySchema.parse(req.body)
      const { sub: userId } = req.user as UserPayload

      const caso = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

      const dataEntrega = status === 'ENTREGUE' ? new Date() : null;

      const item = await prisma.serviceDeliverable.create({
        data: {
          tipo,
          status,
          observacoes,
          casoId: caseId, // CORREÇÃO: Mapeamento explícito (Banco: Variável)
          responsavelId: userId,
          dataSolicitacao: new Date(),
          dataEntrega
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId: caseId, // CORREÇÃO AQUI TAMBÉM
          autorId: userId,
          acao: LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Registrou entrega/benefício: ${tipo} (${status})`
        }
      })

      return reply.status(201).send(item)

    } catch (error) {
      console.error("Erro POST Deliverables:", error)
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      return reply.status(500).send({ message: 'Erro ao registrar benefício.' })
    }
  })

  // [PATCH] Atualizar Status
  app.patch('/deliverables/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      status: z.enum(['SOLICITADO', 'CONCEDIDO', 'NEGADO', 'ENTREGUE']),
      dataEntrega: z.preprocess(emptyToNull, z.string().optional().nullable()),
      observacoes: z.preprocess(emptyToNull, z.string().optional().nullable())
    })

    try {
      const { id } = paramsSchema.parse(req.params)
      const { status, dataEntrega, observacoes } = bodySchema.parse(req.body)
      const { sub: userId } = req.user as UserPayload

      const oldItem = await prisma.serviceDeliverable.findUnique({ where: { id } })
      if (!oldItem) return reply.status(404).send({ message: 'Item não encontrado.' })

      let finalDate = oldItem.dataEntrega;
      
      if (dataEntrega) {
        finalDate = new Date(dataEntrega);
      } else if (status === 'ENTREGUE' && oldItem.status !== 'ENTREGUE') {
        finalDate = new Date();
      } else if (status !== 'ENTREGUE') {
        finalDate = null;
      }

      const updated = await prisma.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          observacoes,
          dataEntrega: finalDate,
          updatedAt: new Date()
        }
      })

      if (oldItem.status !== status || oldItem.observacoes !== observacoes) {
        await prisma.caseLog.create({
          data: {
            casoId: oldItem.casoId,
            autorId: userId,
            acao: LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
            descricao: `Atualizou benefício ${oldItem.tipo}: ${oldItem.status} -> ${status}`
          }
        })
      }

      return reply.send(updated)

    } catch (error) {
      console.error("Erro PATCH Deliverables:", error)
      return reply.status(500).send({ message: 'Erro ao atualizar benefício.' })
    }
  })

  // [DELETE] Remover
  app.delete('/deliverables/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    
    try {
      const { id } = paramsSchema.parse(req.params)
      const { sub: userId, cargo } = req.user as UserPayload

      const item = await prisma.serviceDeliverable.findUnique({ where: { id } })
      if (!item) return reply.status(404).send({ message: 'Item não encontrado.' })

      if (item.responsavelId !== userId && cargo !== Cargo.Gerente) {
         return reply.status(403).send({ message: "Sem permissão para excluir." })
      }

      await prisma.serviceDeliverable.delete({ where: { id } })

      await prisma.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Removeu registro de benefício: ${item.tipo}`
        }
      })

      return reply.status(204).send()

    } catch (error) {
      console.error("Erro DELETE Deliverables:", error)
      return reply.status(500).send({ message: 'Erro ao excluir item.' })
    }
  })
}