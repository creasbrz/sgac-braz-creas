// backend/src/controllers/PafController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { PafService } from '../services/PafService'
import { Cargo } from '@prisma/client'

interface PafBody {
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: Date | string
}

export class PafController {

  static async getCurrent(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const paf = await PafService.getByCaseId(req.params.caseId)
    return reply.send(paf)
  }

  static async getHistory(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const history = await PafService.getHistory(req.params.caseId)
    return reply.send(history)
  }

  static async create(req: FastifyRequest<{ Params: { caseId: string }, Body: PafBody }>, reply: FastifyReply) {
    const { cargo, sub: autorId } = req.user as { sub: string, cargo: string }

    if (cargo !== Cargo.Especialista && cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Apenas especialistas ou gerentes podem criar PAF.' })
    }

    try {
      const created = await PafService.create({
        casoId: req.params.caseId,
        autorId,
        diagnostico: req.body.diagnostico,
        objetivos: req.body.objetivos,
        estrategias: req.body.estrategias,
        deadline: new Date(req.body.deadline)
      })
      return reply.status(201).send(created)
    } catch (error: any) {
      if (error.message === 'ALREADY_EXISTS') return reply.status(409).send({ message: 'Já existe um PAF para este caso. Use a atualização.' })
      throw error
    }
  }

  static async update(req: FastifyRequest<{ Params: { caseId: string }, Body: Partial<PafBody> }>, reply: FastifyReply) {
    const { cargo, sub: userId } = req.user as { sub: string, cargo: string }

    if (cargo !== Cargo.Gerente && cargo !== Cargo.Especialista) {
      return reply.status(403).send({ message: 'Sem permissão para editar este PAF.' })
    }

    try {
      const deadline = req.body.deadline ? new Date(req.body.deadline) : undefined

      const updated = await PafService.update({
        casoId: req.params.caseId,
        userId,
        ...req.body,
        deadline
      })
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'PAF não encontrado.' })
      throw error
    }
  }
}