// backend/src/routes/waitingList.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { WaitingListService } from '../services/WaitingListService'

// --- Schemas ---

const waitingCaseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  dataEntrada: z.date(),
  urgencia: z.string(),
  pesoUrgencia: z.number(),
  violacao: z.array(z.string()), 
  status: z.string(),
  agenteAcolhida: z.object({ nome: z.string() }).nullable().optional(),
  especialistaPAEFI: z.object({ nome: z.string() }).nullable().optional()
})

const assignBodySchema = z.object({
  targetUserId: z.string().uuid().optional()
})

export async function waitingListRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] Listar Fila
  server.get('/cases/waiting', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Listar casos parados aguardando ação do usuário logado',
      response: {
        200: z.array(waitingCaseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }

    try {
      const cases = await WaitingListService.getWaitingList(userId, cargo)
      return reply.send(cases)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao buscar fila de espera.' })
    }
  })

  // 2. [PATCH] Ações da Fila
  server.patch('/cases/waiting/:id/assign', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Realizar ação da fila (Iniciar Acolhida, Distribuir ou Iniciar Acompanhamento)',
      params: z.object({ id: z.string().uuid() }),
      body: assignBodySchema,
      response: {
        200: z.object({ status: z.string() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { targetUserId } = req.body
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }

    try {
      const result = await WaitingListService.processAction({
        caseId: id,
        userId,
        cargo,
        targetUserId
      })
      return reply.send(result)

    } catch (error: any) {
      // Tratamento de Erros de Domínio
      switch (error.message) {
        case 'NOT_FOUND':
          return reply.status(404).send({ message: 'Caso não encontrado.' })
        case 'FORBIDDEN_OWNERSHIP':
          return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        case 'MISSING_TARGET_USER':
          return reply.status(400).send({ message: 'Selecione um especialista para assumir o caso.' })
        case 'INVALID_TRANSITION':
          return reply.status(400).send({ message: 'Ação não permitida para o status atual ou seu cargo.' })
        default:
          req.log.error(error)
          return reply.status(500).send({ message: 'Erro ao processar ação na fila.' })
      }
    }
  })
}