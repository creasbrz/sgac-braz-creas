// backend/src/routes/groups.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { GroupType } from '@prisma/client'
import { GroupService } from '../services/GroupService'

interface UserPayload {
  sub: string
  name: string
  roles: string[]
}

const groupResponseSchema = z.object({
  id: z.string().uuid(),
  tema: z.string(),
  tipo: z.nativeEnum(GroupType),
  dataRealizacao: z.date(),
  local: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  facilitador: z.object({ nome: z.string() }).optional(),
  _count: z.object({ participantes: z.number() }).optional(),
  attendanceConfirmed: z.boolean().default(false),
  participantes: z.array(z.object({
    id: z.string(),
    presente: z.boolean(),
    observacoes: z.string().nullable().optional(),
    casoId: z.string().uuid(),
    caso: z.object({
      id: z.string(),
      nomeCompleto: z.string()
    })
  })).optional()
})

const createGroupSchema = z.object({
  tema: z.string().min(3, "Tema deve ter no mínimo 3 caracteres"),
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
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Sessão expirada ou inválida.' }) }
  })

  // 1. [GET] LISTAR GRUPOS
  server.get('/groups', {
    schema: {
      tags: ['Grupos'],
      response: { 200: z.array(groupResponseSchema) }
    }
  }, async (req, reply) => {
    const groups = await GroupService.list()
    return reply.send(groups)
  })

  // 2. [GET] DETALHES DO GRUPO
  server.get('/groups/:id', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 200: groupResponseSchema }
    }
  }, async (req, reply) => {
    const group = await GroupService.getById(req.params.id)
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado' })
    return reply.send(group)
  })

  // 3. [GET] LISTAR CANDIDATOS
  server.get('/groups/:id/candidates', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: {
        200: z.array(z.object({
          id: z.string(),
          nomeCompleto: z.string(),
          status: z.string()
        }))
      }
    }
  }, async (req, reply) => {
    try {
      const candidates = await GroupService.getCandidates(req.params.id)
      return reply.send(candidates)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Grupo não encontrado' })
      throw error
    }
  })

  // 4. [POST] CRIAR GRUPO
  server.post('/groups', {
    schema: {
      tags: ['Grupos'],
      body: createGroupSchema,
      response: { 201: z.object({ count: z.number(), message: z.string() }) }
    }
  }, async (req, reply) => {
    const user = req.user as UserPayload

    try {
      const createdGroups = await GroupService.create({
        ...req.body,
        facilitadorId: user.sub
      })

      return reply.status(201).send({ 
        count: createdGroups.length, 
        message: createdGroups.length > 1 
          ? `Cronograma criado com ${createdGroups.length} atividades.`
          : 'Atividade agendada com sucesso.'
      })
    } catch (error: any) {
      if (error.message === 'MISSING_DATE') return reply.status(400).send({ message: 'É necessário informar a data da atividade.' })
      throw error
    }
  })

  // 5. [POST] ADICIONAR PARTICIPANTES
  server.post('/groups/:id/participants', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ caseIds: z.array(z.string().uuid()) }),
      response: { 200: z.object({ message: z.string() }) }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { caseIds } = req.body
    const user = req.user as UserPayload
    
    try {
      const count = await GroupService.addParticipants(id, caseIds, user.sub)
      if (count === 0) return reply.send({ message: 'Todos os selecionados já estão no grupo.' })
      return reply.send({ message: `${count} participantes adicionados com sucesso.` })
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Grupo não encontrado.' })
      throw error
    }
  })

  // 6. [PATCH] ATUALIZAR PRESENÇA
  server.patch('/groups/:groupId/attendance/:caseId', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ groupId: z.string().uuid(), caseId: z.string().uuid() }),
      body: z.object({ presente: z.boolean(), observacoes: z.string().optional() })
    }
  }, async (req, reply) => {
    const { groupId, caseId } = req.params
    const { presente, observacoes } = req.body
    const user = req.user as UserPayload

    try {
      const updated = await GroupService.updateAttendance(groupId, caseId, presente, observacoes, user.sub)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'ATTENDANCE_NOT_FOUND') return reply.status(404).send({ message: 'Participante não está neste grupo.' })
      throw error
    }
  })

  // 7. [PATCH] FINALIZAR ATIVIDADE
  server.patch('/groups/:id/confirm', {
    schema: {
      tags: ['Grupos'],
      params: z.object({ id: z.string().uuid() }),
      response: { 200: z.object({ message: z.string(), attendanceConfirmed: z.boolean() }) }
    }
  }, async (req, reply) => {
    const group = await GroupService.confirmAttendance(req.params.id)
    return reply.send({ 
      message: 'Lista de presença fechada com sucesso.',
      attendanceConfirmed: group.attendanceConfirmed
    })
  })
}