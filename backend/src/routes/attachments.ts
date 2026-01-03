// backend/src/routes/attachments.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { LogAction, Cargo } from '@prisma/client'

// Tipagem do Usuário
interface UserPayload {
  sub: string
  cargo: Cargo
}

// Validação de Assinatura (Magic Numbers) - BLINDAGEM DE UPLOAD
// Impede que arquivos maliciosos sejam enviados apenas trocando a extensão
async function validateFileSignature(buffer: Buffer): Promise<'pdf' | 'image' | null> {
  const bytes = buffer.subarray(0, 4).toString('hex').toUpperCase()
  
  const signatures: Record<string, string[]> = {
    '25504446': ['pdf'], // %PDF
    'FFD8FFE0': ['image'], // JPEG
    'FFD8FFE1': ['image'],
    'FFD8FFEE': ['image'],
    'FFD8FFDB': ['image'],
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

  // [POST] Upload de arquivo
  app.post('/cases/:caseId/attachments', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    try {
      const { caseId } = paramsSchema.parse(request.params)
      const { sub: userId } = request.user as UserPayload

      // 1. Verifica se o caso existe ANTES de processar o arquivo
      const caso = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caso) {
        // Importante: Consumir o stream do arquivo mesmo se der erro, para não travar o navegador
        const part = await request.file()
        if (part) await part.toBuffer() 
        return reply.status(404).send({ message: 'Caso não encontrado.' })
      }

      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      // 2. Carrega arquivo em memória (Buffer)
      // Nota: O limite de tamanho deve ser configurado no server.ts (fastify-multipart)
      const buffer = await data.toBuffer()

      // 3. Validação de Segurança (Magic Numbers)
      const fileType = await validateFileSignature(buffer)
      if (!fileType) {
        return reply.status(400).send({ 
          message: 'Arquivo inválido. O sistema aceita apenas PDF, JPG e PNG legítimos.' 
        })
      }

      // 4. Sanitização e Caminho
      const safeFilename = data.filename.replace(/[^a-zA-Z0-9.]/g, '_')
      const fileName = `${Date.now()}-${safeFilename}`
      
      const uploadDir = path.resolve(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const uploadPath = path.join(uploadDir, fileName)

      // 5. Salva no Disco
      fs.writeFileSync(uploadPath, buffer)

      // 6. Tenta Salvar no Banco (Com Rollback em caso de falha)
      try {
        const anexo = await prisma.anexo.create({
          data: {
            nome: data.filename,
            tipo: data.mimetype,
            url: `/uploads/${fileName}`,
            casoId: caseId,
            autorId: userId,
            tamanho: buffer.length
          }
        })

        // Log de Auditoria
        await prisma.caseLog.create({
          data: {
            casoId: caseId, 
            autorId: userId,
            acao: LogAction.ANEXO_ADICIONADO,
            descricao: `Anexou documento: ${data.filename}`
          }
        })

        return reply.status(201).send(anexo)

      } catch (dbError) {
        // ROLLBACK: Se deu erro no banco, apaga o arquivo físico para não deixar lixo
        if (fs.existsSync(uploadPath)) {
          fs.unlinkSync(uploadPath)
          console.log(`[Rollback] Arquivo órfão removido: ${fileName}`)
        }
        throw dbError // Joga para o catch principal
      }

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
      const { sub: userId, cargo } = request.user as UserPayload

      const anexo = await prisma.anexo.findUnique({ where: { id } })
      if (!anexo) return reply.status(404).send({ message: 'Arquivo não encontrado.' })

      // Permissão: Autor ou Gerente
      if (anexo.autorId !== userId && cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Sem permissão para excluir este anexo.' })
      }

      // 1. Remove do Banco primeiro
      await prisma.anexo.delete({ where: { id } })

      // 2. Remove do Disco (Se falhar, não tem problema grave, apenas ocupa espaço)
      try {
        const filePath = path.resolve(process.cwd(), 'uploads', path.basename(anexo.url))
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch (e) { 
        console.error("Aviso: Falha ao apagar arquivo físico (pode já ter sido removido):", e) 
      }

      // Log
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