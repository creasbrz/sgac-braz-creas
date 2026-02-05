// backend/src/controllers/GroupController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { GroupService } from '../services/GroupService'
import { GroupType } from '@prisma/client'

interface CreateGroupBody {
  tema: string
  tipo: GroupType
  datas?: string[]
  dataRealizacao?: string
  local?: string
  descricao?: string
  orgaosEnvolvidos?: string[]
}

export class GroupController {
  static async list(req: FastifyRequest, reply: FastifyReply) {
    const groups = await GroupService.list()
    return reply.send(groups)
  }

  static async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const group = await GroupService.getById(req.params.id)
    if (!group) return reply.status(404).send({ message: 'Grupo não encontrado' })
    return reply.send(group)
  }

  static async getCandidates(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const candidates = await GroupService.getCandidates(req.params.id)
      return reply.send(candidates)
    } catch (e) {
      return reply.status(404).send({ message: 'Grupo não encontrado' })
    }
  }

  static async create(req: FastifyRequest<{ Body: CreateGroupBody }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const created = await GroupService.create({ ...req.body, facilitadorId: userId })
      return reply.status(201).send({ 
        count: created.length, 
        message: created.length > 1 ? `Cronograma criado com ${created.length} atividades.` : 'Atividade agendada.' 
      })
    } catch (e: any) {
      if (e.message === 'MISSING_DATE') return reply.status(400).send({ message: 'Data obrigatória.' })
      throw e
    }
  }

  static async addParticipants(req: FastifyRequest<{ Params: { id: string }, Body: { caseIds: string[] } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const count = await GroupService.addParticipants(req.params.id, req.body.caseIds, userId)
      return reply.send({ message: `${count} participantes adicionados.` })
    } catch (e) {
      return reply.status(404).send({ message: 'Grupo não encontrado.' })
    }
  }

  static async updateAttendance(req: FastifyRequest<{ Params: { groupId: string, caseId: string }, Body: { presente: boolean, observacoes?: string } }>, reply: FastifyReply) {
    const { sub: userId } = req.user as { sub: string }
    try {
      const updated = await GroupService.updateAttendance(req.params.groupId, req.params.caseId, req.body.presente, req.body.observacoes, userId)
      return reply.send(updated)
    } catch (e: any) {
      if (e.message === 'ATTENDANCE_NOT_FOUND') return reply.status(404).send({ message: 'Participante não encontrado neste grupo.' })
      throw e
    }
  }

  static async confirmAttendance(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const group = await GroupService.confirmAttendance(req.params.id)
    return reply.send({ message: 'Lista fechada.', attendanceConfirmed: group.attendanceConfirmed })
  }
}