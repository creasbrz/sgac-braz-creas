// backend/src/controllers/AttachmentController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { AttachmentService } from '../services/AttachmentService'

export class AttachmentController {
  static async list(req: FastifyRequest<{ Params: { caseId: string } }>, reply: FastifyReply) {
    const { caseId } = req.params
    const attachments = await AttachmentService.list(caseId)
    return reply.send(attachments)
  }

  static async upload(req: FastifyRequest<{ Querystring: { caseId: string } }>, reply: FastifyReply) {
    const { caseId } = req.query
    const data = await req.file()
    
    if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })

    const buffer = await data.toBuffer()
    const { sub: userId } = req.user as { sub: string }

    try {
      const anexo = await AttachmentService.upload({
        caseId,
        userId,
        filename: data.filename,
        buffer
      })
      return reply.status(201).send(anexo)
    } catch (error: any) {
      if (error.message === 'INVALID_FILE_TYPE') {
        return reply.status(400).send({ message: 'Tipo de arquivo inválido. Apenas PDF e Imagens.' })
      }
      throw error
    }
  }

  static async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params
    const { sub: userId, cargo } = req.user as { sub: string, cargo: string }

    try {
      await AttachmentService.delete(id, userId, cargo)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Arquivo não encontrado.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão.' })
      throw error
    }
  }
}