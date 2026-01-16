// backend/src/routes/attachments.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { AttachmentService } from '../services/AttachmentService'

const attachmentResponseSchema = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  tipo: z.string(),
  url: z.string(),
  tamanho: z.number().nullable(),
  createdAt: z.date(),
  autor: z.object({ nome: z.string() }).optional()
})

export async function attachmentRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. [GET] Listar anexos
  server.get('/cases/:caseId/attachments', {
    schema: {
      tags: ['Anexos'],
      summary: 'Listar arquivos anexados ao caso',
      params: z.object({ caseId: z.string().uuid() }),
      response: {
        200: z.array(attachmentResponseSchema)
      }
    }
  }, async (request, reply) => {
    const { caseId } = request.params
    const attachments = await AttachmentService.list(caseId)
    return reply.send(attachments)
  })

  // 2. [POST] Upload de Arquivo
  server.post('/attachments', {
    schema: {
      tags: ['Anexos'],
      summary: 'Fazer upload de arquivo (PDF/Imagem)',
      querystring: z.object({ caseId: z.string().uuid() }), 
    }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: 'Requisição deve ser multipart/form-data' })
    }

    const { caseId } = request.query
    const data = await request.file()
    
    if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })

    // Converte stream para buffer (necessário para análise de assinatura e upload seguro)
    const buffer = await data.toBuffer()
    const { sub: userId } = request.user as { sub: string }

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
        return reply.status(400).send({ message: 'Tipo de arquivo inválido. Apenas PDF e Imagens (JPG/PNG).' })
      }
      
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao processar upload.' })
    }
  })

  // 3. [DELETE] Remover anexo
  server.delete('/attachments/:id', {
    schema: {
      tags: ['Anexos'],
      summary: 'Remover um arquivo anexo',
      params: z.object({ id: z.string().uuid() }),
      response: { 204: z.null() }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    try {
      await AttachmentService.delete(id, userId, cargo)
      return reply.status(204).send()
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Arquivo não encontrado.' })
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ message: 'Sem permissão para remover este anexo.' })
      
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao remover anexo.' })
    }
  })
}