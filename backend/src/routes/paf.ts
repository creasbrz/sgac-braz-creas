// backend/src/routes/paf.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { PafService } from '../services/PafService'

// --- SCHEMAS ---

const pafBodySchema = z.object({
  diagnostico: z.string().min(10, "O diagnóstico deve conter ao menos 10 caracteres."),
  objetivos: z.string().min(10, "Os objetivos devem conter ao menos 10 caracteres."),
  estrategias: z.string().min(10, "As estratégias devem conter ao menos 10 caracteres."),
  deadline: z.coerce.date({ required_error: "O prazo é obrigatório." }),
})

const pafResponseSchema = z.object({
  id: z.string().uuid(),
  diagnostico: z.string(),
  objetivos: z.string(),
  estrategias: z.string(),
  deadline: z.date(),
  versaoAtual: z.number(),
  updatedAt: z.date(),
  autor: z.object({
    id: z.string(),
    nome: z.string()
  }).optional()
})

const versionResponseSchema = z.object({
  id: z.string().uuid(),
  savedAt: z.date(),
  versaoNumero: z.number(),
  diagnostico: z.string(),
  objetivos: z.string(),
  estrategias: z.string(),
  deadline: z.date(),
  autor: z.object({ nome: z.string().nullable() }).optional()
})

// --- ROTAS ---

export async function pafRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. [GET] Buscar PAF Atual do Caso
  server.get('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Obter o Plano de Acompanhamento Familiar atual',
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: pafResponseSchema.nullable() }
    }
  }, async (request, reply) => {
    const paf = await PafService.getByCaseId(request.params.caseId)
    return reply.send(paf)
  })

  // 2. [GET] Histórico de Versões
  server.get('/cases/:caseId/paf/history', {
    schema: {
      tags: ['PAF'],
      summary: 'Listar versões anteriores do PAF',
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(versionResponseSchema) }
    }
  }, async (request, reply) => {
    const history = await PafService.getHistory(request.params.caseId)
    return reply.send(history)
  })

  // 3. [POST] Criar PAF (Primeira versão)
  server.post('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Criar o primeiro PAF do caso',
      params: z.object({ caseId: z.string().uuid() }),
      body: pafBodySchema,
      response: { 201: pafResponseSchema }
    }
  }, async (request, reply) => {
    const { cargo, sub: autorId } = request.user as { sub: string, cargo: string }

    if (cargo !== Cargo.Especialista && cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Apenas especialistas ou gerentes podem criar PAF.' })
    }

    try {
      const created = await PafService.create({
        casoId: request.params.caseId,
        autorId,
        ...request.body
      })
      return reply.status(201).send(created)
    } catch (error: any) {
      if (error.message === 'ALREADY_EXISTS') return reply.status(409).send({ message: 'Já existe um PAF para este caso. Use a rota de atualização (PUT).' })
      throw error
    }
  })

  // 4. [PUT] Atualizar PAF (Gera Versão)
  server.put('/cases/:caseId/paf', {
    schema: {
      tags: ['PAF'],
      summary: 'Atualizar PAF (Gera nova versão automaticamente)',
      params: z.object({ caseId: z.string().uuid() }),
      body: pafBodySchema.partial(),
      response: { 200: pafResponseSchema }
    }
  }, async (request, reply) => {
    const { cargo, sub: userId } = request.user as { sub: string, cargo: string }

    if (cargo !== Cargo.Gerente && cargo !== Cargo.Especialista) {
      return reply.status(403).send({ message: 'Sem permissão para editar este PAF.' })
    }

    try {
      const updated = await PafService.update({
        casoId: request.params.caseId,
        userId,
        ...request.body
      })
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'PAF não encontrado.' })
      throw error
    }
  })
}