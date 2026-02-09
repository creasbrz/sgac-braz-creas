// backend/src/routes/instrumentals.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { InstrumentalService } from '../services/InstrumentalService'
import { upsertPafSchema, createDocumentSchema } from '../schemas/instrumentalSchema'

export async function instrumentalRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } 
    catch (err) { await reply.status(401).send({ message: 'Unauthorized' }) }
  })

  // --- PAF ---

  server.post('/instrumentals/paf', {
    schema: {
      tags: ['Instrumentais'],
      body: upsertPafSchema,
      summary: 'Criar ou Atualizar PAF'
    }
  }, async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await InstrumentalService.upsertPaf(sub, req.body)
    return reply.send(result)
  })

  server.get('/instrumentals/paf/history/:caseId', {
    schema: {
      tags: ['Instrumentais'],
      params: z.object({ caseId: z.string().uuid() })
    }
  }, async (req, reply) => {
    const result = await InstrumentalService.getPafHistory(req.params.caseId)
    return reply.send(result)
  })

  // --- DOCUMENTOS TÉCNICOS ---

  server.post('/instrumentals/documents', {
    schema: {
      tags: ['Instrumentais'],
      body: createDocumentSchema,
      summary: 'Gerar documento técnico (Relatórios, etc)'
    }
  }, async (req, reply) => {
    const { sub } = req.user as { sub: string }
    const result = await InstrumentalService.createDocument(sub, req.body)
    return reply.status(201).send(result)
  })

  server.get('/instrumentals/documents/:caseId', {
    schema: {
      tags: ['Instrumentais'],
      params: z.object({ caseId: z.string().uuid() })
    }
  }, async (req, reply) => {
    const result = await InstrumentalService.listDocuments(req.params.caseId)
    return reply.send(result)
  })
}