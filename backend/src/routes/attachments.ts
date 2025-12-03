// backend/src/routes/attachments.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { LogAction, Cargo } from '@prisma/client'

// Função auxiliar para validar Assinatura de Arquivo (Magic Numbers)
// Isso impede que alguém renomeie um .exe para .pdf e faça upload
async function validateFileSignature(buffer: Buffer): Promise<'pdf' | 'image' | null> {
  const bytes = buffer.subarray(0, 4).toString('hex').toUpperCase()
  
  // Assinaturas conhecidas
  const signatures: Record<string, string[]> = {
    '25504446': ['pdf'], // %PDF
    'FFD8FFE0': ['image'], // JPEG
    'FFD8FFE1': ['image'], // JPEG
    'FFD8FFEE': ['image'], // JPEG
    'FFD8FFDB': ['image'], // JPEG
    '89504E47': ['image'], // PNG
  }

  for (const [sig, types] of Object.entries(signatures)) {
    if (bytes.startsWith(sig)) return types[0] as 'pdf' | 'image'
  }
  
  return null
}

export async function attachmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [POST] Upload de arquivo com Validação de Segurança
  app.post('/cases/:caseId/attachments', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const { sub: userId } = request.user as { sub: string }

      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      // 1. Converte o stream para Buffer para análise de segurança
      const buffer = await data.toBuffer()

      // 2. Validação de Magic Numbers (Anti-Malware básico)
      const fileType = await validateFileSignature(buffer)
      
      if (!fileType) {
        return reply.status(400).send({ 
          message: 'Arquivo inválido ou corrompido. Apenas PDF, JPG e PNG reais são permitidos.' 
        })
      }

      // 3. Sanitização do Nome e Caminho
      // Remove caracteres especiais e espaços para evitar problemas no sistema de arquivos
      const safeFilename = data.filename.replace(/[^a-zA-Z0-9.]/g, '_')
      const fileName = `${Date.now()}-${safeFilename}`
      
      const uploadDir = path.resolve(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const uploadPath = path.join(uploadDir, fileName)

      // 4. Salvar no Disco
      fs.writeFileSync(uploadPath, buffer)

      // 5. Salvar Metadados no Banco
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename, // Mantém nome original para exibição
          tipo: data.mimetype,
          url: `/uploads/${fileName}`,
          casoId: caseId,
          autorId: userId,
          tamanho: buffer.length // Salva o tamanho em bytes
        }
      })

      // 6. Log de Auditoria
      await prisma.caseLog.create({
        data: {
          casoId: caseId, 
          autorId: userId,
          acao: LogAction.ANEXO_ADICIONADO,
          descricao: `Anexou documento: ${data.filename}`
        }
      })

      return reply.status(201).send(anexo)

    } catch (error) {
      console.error("❌ Erro no Upload:", error)
      return reply.status(500).send({ message: "Erro interno ao salvar arquivo." })
    }
  })

  // [GET] Listar anexos
  app.get('/cases/:caseId/attachments', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    try {
      const { caseId } = paramsSchema.parse(request.params)

      const anexos = await prisma.anexo.findMany({
        where: { casoId: caseId }, 
        orderBy: { createdAt: 'desc' },
        include: { autor: { select: { nome: true } } }
      })
      
      return reply.send(anexos)
    } catch (error) {
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

      // Apenas o autor ou Gerente pode apagar
      if (anexo.autorId !== userId && cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Sem permissão para excluir este anexo.' })
      }

      await prisma.anexo.delete({ where: { id } })

      // Remove do disco
      try {
        const filePath = path.resolve(process.cwd(), 'uploads', path.basename(anexo.url))
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch (e) { 
        console.error("Erro ao apagar arquivo físico:", e) 
      }

      // Log da exclusão
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: LogAction.OUTRO, 
          descricao: `Removeu anexo: ${anexo.nome}`
        }
      })

      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao remover anexo." })
    }
  })
}