// backend/src/routes/attachments.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { LogAction, Cargo } from '@prisma/client'

export async function attachmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [POST] Upload de arquivo
  app.post('/cases/:caseId/attachments', async (request, reply) => {
    console.log("📥 [API] Recebendo upload...")

    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const { sub: userId } = request.user as { sub: string }

      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      // Validação de Tipo
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedMimeTypes.includes(data.mimetype)) {
        await data.toBuffer() // Consome o stream para evitar travamento
        return reply.status(400).send({ message: 'Formato inválido. Use PDF ou Imagens.' })
      }

      // Nome e Caminho
      const safeFilename = data.filename.replace(/[^a-zA-Z0-9.]/g, '_')
      const fileName = `${Date.now()}-${safeFilename}`
      
      const uploadDir = path.resolve(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const uploadPath = path.join(uploadDir, fileName)

      // Salvar no Disco
      await pipeline(data.file, fs.createWriteStream(uploadPath))

      // Salvar no Banco
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          tipo: data.mimetype,
          url: `/uploads/${fileName}`,
          casoId: caseId,
          autorId: userId,
          tamanho: 0
        }
      })

      // Log (Corrigido: usa caseId)
      await prisma.caseLog.create({
        data: {
          casoId: caseId, 
          autorId: userId,
          acao: LogAction.ANEXO_ADICIONADO,
          descricao: `Anexou: ${data.filename}`
        }
      })

      return reply.status(201).send(anexo)

    } catch (error) {
      console.error("❌ Erro no Upload:", error)
      return reply.status(500).send({ message: "Erro interno ao salvar." })
    }
  })

  // [GET] Listar anexos
  app.get('/cases/:caseId/attachments', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    try {
      const { caseId } = paramsSchema.parse(request.params)

      const anexos = await prisma.anexo.findMany({
        // [CORREÇÃO CRÍTICA AQUI]
        // Mapeamos a variável da URL 'caseId' para o campo do banco 'casoId'
        where: { casoId: caseId }, 
        orderBy: { createdAt: 'desc' },
        include: { autor: { select: { nome: true } } }
      })
      
      return reply.send(anexos)
    } catch (error) {
      console.error("❌ Erro ao listar anexos:", error)
      return reply.status(500).send({ message: "Erro ao listar anexos." })
    }
  })

  // [DELETE] Remover anexo
  app.delete('/attachments/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    try {
      const { id } = paramsSchema.parse(request.params)
      const { sub: userId, cargo } = request.user as { sub: string, cargo: Cargo }

      const anexo = await prisma.anexo.findUnique({ where: { id } })
      if (!anexo) return reply.status(404).send({ message: 'Arquivo não encontrado.' })

      if (anexo.autorId !== userId && cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Sem permissão.' })
      }

      await prisma.anexo.delete({ where: { id } })

      try {
        const filePath = path.resolve(process.cwd(), 'uploads', path.basename(anexo.url))
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch (e) { console.error("Erro ao apagar arquivo:", e) }

      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: LogAction.OUTRO, 
          descricao: `Removeu: ${anexo.nome}`
        }
      })

      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover." })
    }
  })
}