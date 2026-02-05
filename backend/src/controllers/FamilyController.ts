// backend/src/controllers/FamilyController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { FamilyService } from '../services/FamilyService'

// Interface para Body
interface CreateMemberBody {
  nome: string
  parentesco: string
  idade?: number
  cpf?: string | null
  nascimento?: Date | string
  telefone?: string | null
  ocupacao?: string
  renda?: number
  observacoes?: string
}

export class FamilyController {
  static async list(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const { caseId } = req.params
    const members = await FamilyService.list(caseId)
    return reply.send(members)
  }

  static async create(req: FastifyRequest<{ Params: { caseId: string }, Body: CreateMemberBody }>, reply: FastifyReply) {
    const { caseId } = req.params
    const { sub: userId } = req.user as { sub: string }

    try {
      const member = await FamilyService.add({
        caseId,
        userId,
        ...req.body,
        nascimento: req.body.nascimento ? new Date(req.body.nascimento) : undefined
      })
      return reply.status(201).send(member)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao adicionar familiar.' })
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }
    
    try {
      await FamilyService.remove(id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send()
      throw error
    }
  }
}