// backend/src/services/AttachmentService.ts
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadInput {
  caseId: string
  userId: string
  filename: string
  buffer: Buffer
}

export class AttachmentService {

  /**
   * Valida a assinatura binária do arquivo (Magic Numbers)
   */
  private static async validateFileSignature(buffer: Buffer): Promise<'pdf' | 'image' | null> {
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

  /**
   * Helper para Upload Stream do Cloudinary
   */
  private static uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error)
          if (!result) return reject(new Error('Falha no upload: Resposta vazia do Cloudinary'))
          resolve(result)
        }
      )
      
      // SOLUÇÃO FINAL: Cast para 'any' para garantir que o TS aceite o método .end()
      // mesmo que as definições de tipo do Node/Cloudinary estejam em conflito.
      ;(uploadStream as any).end(buffer)
    })
  }

  /**
   * Lista anexos de um caso
   */
  static async list(caseId: string) {
    return prisma.anexo.findMany({
      where: { casoId: caseId }, 
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nome: true } } }
    })
  }

  /**
   * Realiza o processo completo de Upload Seguro
   */
  static async upload({ caseId, userId, filename, buffer }: UploadInput) {
    // 1. Validação de Segurança
    const fileType = await this.validateFileSignature(buffer)
    if (!fileType) {
      throw new Error('INVALID_FILE_TYPE')
    }

    // 2. Upload para Cloudinary
    const uploadResult = await this.uploadToCloudinary(buffer, 'sgac_anexos')

    // 3. Persistência no Banco
    const anexo = await prisma.anexo.create({
      data: {
        nome: filename,
        tipo: fileType,
        url: uploadResult.secure_url,
        tamanho: buffer.length,
        casoId: caseId,
        autorId: userId
      }
    })

    // 4. Log de Auditoria
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.ANEXO_ADICIONADO,
        descricao: `Anexo adicionado: ${filename}`
      }
    }).catch(console.error)

    return anexo
  }

  /**
   * Remove anexo (Banco + Cloudinary)
   */
  static async delete(id: string, userId: string, cargo: string) {
    const anexo = await prisma.anexo.findUnique({ where: { id } })
    if (!anexo) throw new Error('NOT_FOUND')

    // Verificação de Permissão
    const canDelete = anexo.autorId === userId || cargo === Cargo.Gerente || cargo === Cargo.Auditor
    if (!canDelete) throw new Error('FORBIDDEN')

    // 1. Remove do Banco
    await prisma.anexo.delete({ where: { id } })

    // 2. Tenta remover do Cloudinary
    try {
      const urlParts = anexo.url.split('/')
      const fileNameWithExt = urlParts[urlParts.length - 1]
      const fileName = fileNameWithExt.split('.')[0]
      const publicId = `sgac_anexos/${fileName}`

      await cloudinary.uploader.destroy(publicId)
    } catch (e) {
      console.warn(`[Cloudinary] Falha ao remover arquivo físico: ${anexo.url}`)
    }

    // 3. Log
    await prisma.caseLog.create({
      data: {
        casoId: anexo.casoId,
        autorId: userId,
        acao: LogAction.OUTRO,
        descricao: `Anexo removido: ${anexo.nome}`
      }
    }).catch(console.error)

    return true
  }
}