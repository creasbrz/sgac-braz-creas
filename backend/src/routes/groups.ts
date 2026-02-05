// backend/src/routes/groups.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { GroupType } from '@prisma/client'
import { GroupController } from '../controllers/GroupController'

const groupResponseSchema = z.object({
  id: z.string().uuid(),
  tema: z.string(),
  tipo: z.nativeEnum(GroupType),
  dataRealizacao: z.date(),
  local: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  facilitador: z.object({ nome: z.string() }).optional(),
  _count: z.object({ participantes: z.number() }).optional(),
  attendanceConfirmed: z.boolean(),
  participantes: z.array(z.object({
    id: z.string(),
    presente: z.boolean(),
    observacoes: z.string().nullable().optional(),
    caso: z.object({ id: z.string(), nomeCompleto: z.string() })
  })).optional()
})

const createGroupSchema = z.object({
  tema: z.string().min(3),
  tipo: z.nativeEnum(GroupType),
  datas: z.array(z.string()).optional(),
  dataRealizacao: z.string().optional(),
  local: z.string().optional(),
  descricao: z.string().optional(),
  orgaosEnvolvidos: z.array(z.string()).default([])
})

export async function groupRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  server.get('/groups', {
    schema: { tags: ['Grupos'], response: { 200: z.array(groupResponseSchema) } }
  }, GroupController.list)

  server.get('/groups/:id', {
    schema: { tags: ['Grupos'], params: z.object({ id: z.string().uuid() }), response: { 200: groupResponseSchema } }
  }, GroupController.getById)

  server.get('/groups/:id/candidates', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 200: z.array(z.object({ id: z.string(), nomeCompleto: z.string(), status: z.string() })) }
    }
  }, GroupController.getCandidates)

  server.post('/groups', {
    schema: {
      tags: ['Grupos'],
      body: createGroupSchema,
      response: { 201: z.object({ count: z.number(), message: z.string() }) }
    }
  }, GroupController.create)

  server.post('/groups/:id/participants', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ caseIds: z.array(z.string().uuid()) }),
      response: { 200: z.object({ message: z.string() }) }
    }
  }, GroupController.addParticipants)

  server.patch('/groups/:groupId/attendance/:caseId', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ groupId: z.string().uuid(), caseId: z.string().uuid() }),
      body: z.object({ presente: z.boolean(), observacoes: z.string().optional() })
    }
  }, GroupController.updateAttendance)

  server.patch('/groups/:id/confirm', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 200: z.object({ message: z.string(), attendanceConfirmed: z.boolean() }) }
    }
  }, GroupController.confirmAttendance)
}