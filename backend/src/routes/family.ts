// backend/src/routes/family.ts
import { type FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { FamilyService } from '../services/FamilyService'

// --- Schemas ---

const familyMemberResponseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  parentesco: z.string(),
  idade: z.number().nullable().optional(),
  cpf: z.string().nullable().optional(),
  nascimento: z.date().nullable().optional(),
  telefone: z.string().nullable().optional(),
  ocupacao: z.string().nullable().optional(),
  renda: z.number().nullable().optional(), // Agora garantimos que é number
  observacoes: z.string().nullable().optional(),
  violacao: z.array(z.string()).optional()
})

const createMemberBodySchema = z.object({
  nome: z.string().min(2),
  parentesco: z.string().min(2),
  idade: z.number().int().nonnegative().optional(),
  cpf: z.string().optional().nullable(),
  nascimento: z.coerce.date().optional().nullable(),
  telefone: z.string().optional().nullable(),
  ocupacao: z.string().optional(),
  renda: z.number().nonnegative().optional(),
  observacoes: z.string().optional()
})

export async function familyRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [GET] Listar família
  server.get('/cases/:caseId/family', {
    schema: {
      tags: ['Família'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(familyMemberResponseSchema) }
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const members = await FamilyService.list(caseId)
    return reply.send(members)
  })

  // [POST] Adicionar membro da família
  server.post('/cases/:caseId/family', {
    schema: {
      tags: ['Família'],
      params: z.object({ caseId: z.string().uuid() }),
      body: createMemberBodySchema,
      response: { 201: familyMemberResponseSchema }
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const { sub: userId } = req.user as { sub: string }

    try {
      const member = await FamilyService.add({
        caseId,
        userId,
        ...req.body
      })
      return reply.status(201).send(member)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao adicionar familiar.' })
    }
  })

  // [DELETE] Remover familiar
  server.delete('/family/:id', {
    schema: {
      tags: ['Família'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }
    
    try {
      await FamilyService.remove(id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send()
      return reply.status(500).send()
    }
  })
}