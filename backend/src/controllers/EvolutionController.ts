// backend/src/controllers/EvolutionController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { EvolutionService } from '../services/EvolutionService'

// Definição das Interfaces de Body/Query
interface CreateEvolutionBody {
  conteudo: string
  sigilo: boolean
}

interface UpdateEvolutionBody {
  conteudo?: string
  sigilo?: boolean
}

interface ListEvolutionQuery {
  page: number
  pageSize: number
}

export class EvolutionController {

  static async list(req: FastifyRequest<{ Params: { caseId: string }, Querystring: ListEvolutionQuery }>, reply: FastifyReply) {
    const { caseId } = req.params
    const { page, pageSize } = req.query
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      const result = await EvolutionService.list({
        caseId,
        userId,
        cargo,
        page,
        pageSize
      })
      return reply.send(result)
    } catch (error: any) {
      if (error.message === 'CASE_NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      throw error
    }
  }

  static async create(req: FastifyRequest<{ Params: { caseId: string }, Body: CreateEvolutionBody }>, reply: FastifyReply) {
    const { caseId } = req.params
    const { sub: userId } = req.user as { sub: string }
    const { conteudo, sigilo } = req.body

    const evolucao = await EvolutionService.create({
      caseId,
      userId,
      conteudo,
      sigilo
    })

    return reply.status(201).send(evolucao)
  }

  static async update(req: FastifyRequest<{ Params: { id: string }, Body: UpdateEvolutionBody }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }
    
    try {
      const updated = await EvolutionService.update(id, userId, req.body)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Evolução não encontrada.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Você só pode editar evoluções criadas por você.' })
      throw error
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }

    try {
      await EvolutionService.delete(id, userId)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Evolução não encontrada.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Você só pode excluir evoluções criadas por você.' })
      throw error
    }
  }
}