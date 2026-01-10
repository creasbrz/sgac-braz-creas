// backend/src/routes/attachments.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { randomUUID } from 'node:crypto'
import { LogAction, Cargo } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Função auxiliar para upload de Buffer
const uploadToCloudinary = (buffer: Buffer, folder: string, resourceType: 'auto' | 'image' | 'raw') => {
  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        // Mantém o nome original ou gera um UUID, aqui deixamos o Cloudinary gerenciar ou usamos o ID
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    // Escreve o buffer no stream de upload
    uploadStream.end(buffer)
  })
}

// Mantemos a sua função de validação de segurança original 
async function validateFileSignature(buffer: Buffer): Promise<'pdf' | 'image' | null> {
  const bytes = buffer.subarray(0, 4).toString('hex').toUpperCase()
  const signatures: Record<string, string[]> = {
    '25504446': ['pdf'],
    'FFD8FFE0': ['image'],
    'FFD8FFE1': ['image'],
    'FFD8FFEE': ['image'],
    'FFD8FFDB': ['image'],
    '89504E47': ['image'],
  }
  for (const [sig, types] of Object.entries(signatures)) {
    if (bytes.startsWith(sig)) return types[0] as 'pdf' | 'image'
  }
  return null
}

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

    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId },
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nome: true } } }
    })

    // Agora retornamos a URL do Cloudinary salva no banco, sem prefixo local
    return reply.send(attachments)
  })

  // 2. [POST] Upload de Arquivo
  server.post('/attachments', {
    schema: {
      tags: ['Anexos'],
      summary: 'Fazer upload de arquivo (PDF/Imagem) para o Cloudinary',
      querystring: z.object({ caseId: z.string().uuid() }), 
    }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: 'Requisição deve ser multipart/form-data' })
    }

    const { caseId } = request.query
    const data = await request.file()
    
    if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })

    const buffer = await data.toBuffer()
    
    // Validação de Segurança
    const fileType = await validateFileSignature(buffer)
    if (!fileType) {
      return reply.status(400).send({ message: 'Tipo de arquivo inválido. Apenas PDF e Imagens (JPG/PNG).' })
    }

    try {
      // Upload para Cloudinary (Pasta: sgac_anexos)
      const uploadResult = await uploadToCloudinary(buffer, 'sgac_anexos', 'auto')

      const { sub: userId } = request.user as { sub: string }
      
      const anexo = await prisma.anexo.create({
        data: {
          nome: data.filename,
          tipo: fileType,
          // Salvamos a URL segura completa (https://...)
          url: uploadResult.secure_url,
          // Podemos salvar o public_id se quisermos deletar depois, mas a URL serve por agora
          tamanho: buffer.length,
          casoId: caseId,
          autorId: userId
        }
      })

      // Log
      prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      }).catch(console.error)

      return reply.status(201).send(anexo)

    } catch (error) {
      console.error('Erro Upload Cloudinary:', error)
      return reply.status(500).send({ message: 'Erro ao fazer upload para a nuvem.' })
    }
  })

  // 3. [DELETE] Remover anexo
  server.delete('/attachments/:id', {
    schema: {
      tags: ['Anexos'],
      summary: 'Remover um arquivo anexo',
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { sub: userId, cargo } = request.user as { sub: string, cargo: string }

    const anexo = await prisma.anexo.findUnique({ where: { id } })
    if (!anexo) return reply.status(404).send({ message: 'Arquivo não encontrado.' })

    const canDelete = anexo.autorId === userId || cargo === Cargo.Gerente || cargo === Cargo.Auditor
    if (!canDelete) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    // Deletar do Banco
    await prisma.anexo.delete({ where: { id } })

    // Tentar deletar do Cloudinary
    // Extrai o public_id da URL (Ex: .../sgac_anexos/xyz.jpg -> sgac_anexos/xyz)
    try {
        const urlParts = anexo.url.split('/')
        const fileNameWithExt = urlParts[urlParts.length - 1]
        const fileName = fileNameWithExt.split('.')[0]
        const publicId = `sgac_anexos/${fileName}` // Assume pasta fixa

        await cloudinary.uploader.destroy(publicId)
    } catch (e) {
        request.log.warn(`Erro ao deletar do Cloudinary (pode já ter sido removido): ${anexo.url}`)
    }

    // Log
    prisma.caseLog.create({
      data: {
        casoId: anexo.casoId,
        autorId: userId,
        acao: LogAction.OUTRO,
        descricao: `Anexo removido: ${anexo.nome}`
      }
    }).catch(console.error)

    return reply.status(204).send()
  })
}