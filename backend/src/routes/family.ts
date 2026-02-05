// backend/src/routes/family.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { FamilyController } from '../controllers/FamilyController'

const familyMemberResponseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  parentesco: z.string(),
  idade: z.number().nullable().optional(),
  cpf: z.string().nullable().optional(),
  nascimento: z.date().nullable().optional(),
  telefone: z.string().nullable().optional(),
  ocupacao: z.string().nullable().optional(),
  renda: z.number().nullable().optional(),
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

  server.get('/cases/:caseId/family', {
    schema: {
      tags: ['Família'],
      params: z.object({ caseId: z.string().uuid() }),
      response: { 200: z.array(familyMemberResponseSchema) }
    }
  }, FamilyController.list)

  server.post('/cases/:caseId/family', {
    schema: {
      tags: ['Família'],
      params: z.object({ caseId: z.string().uuid() }),
      body: createMemberBodySchema,
      response: { 201: familyMemberResponseSchema }
    }
  }, FamilyController.create)

  server.delete('/family/:id', {
    schema: {
      tags: ['Família'],
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, FamilyController.delete)
}