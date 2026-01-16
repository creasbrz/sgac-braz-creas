// backend/src/routes/referrals.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { ReferralService } from '../services/ReferralService'

const referralResponseSchema = z.object({
  id: z.string().uuid(),
  instituicao: z.string(),
  tipo: z.string(),
  motivo: z.string(),
  status: z.string(),
  retorno: z.string().nullable().optional(),
  dataEnvio: z.date(),
  autor: z.object({
    nome: z.string()
  }).optional()
})

export async function referralRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] Listar Encaminhamentos
  server.get('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Listar histórico de encaminhamentos externos',
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(referralResponseSchema) }
    }
  }, async (req, reply) => {
    const referrals = await ReferralService.listByCase(req.params.caseId)
    return reply.send(referrals)
  })

  // 2. [POST] Criar Encaminhamento
  server.post('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Registrar novo encaminhamento para a rede',
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        instituicao: z.string().min(2, "Informe a instituição de destino"),
        tipo: z.string().min(2, "Informe o tipo (Ex: Saúde, Educação)"),
        motivo: z.string().min(5, "Descreva o motivo do encaminhamento"),
      }),
      response: { 201: referralResponseSchema }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string }

    try {
      const result = await ReferralService.create({
        caseId: req.params.caseId,
        userId,
        ...req.body
      })
      return reply.status(201).send(result)
    } catch (error: any) {
      if (error.message === 'CASE_NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado' })
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar encaminhamento.' })
    }
  })

  // 3. [PATCH] Atualizar Status
  server.patch('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Atualizar status ou registrar contrarreferência',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
        retorno: z.string().optional()
      }),
      response: { 200: referralResponseSchema }
    }
  }, async (req, reply) => {
    try {
      const updated = await ReferralService.update({
        id: req.params.id,
        ...req.body
      })
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })
      throw error
    }
  })

  // 4. [DELETE] Excluir Encaminhamento
  server.delete('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Remover um encaminhamento (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string }

    try {
      await ReferralService.delete(req.params.id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Apenas o autor pode excluir este registro.' })
      throw error
    }
  })
}