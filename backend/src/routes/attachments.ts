// backend/src/routes/attachments.ts
import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'node:crypto'
import { LogAction, Cargo } from '@prisma/client'

// Configuração de diretório de upload
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Validação de Assinatura (Magic Numbers)
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

export async function attachmentRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // [GET] Listar anexos de um caso (CORREÇÃO AQUI)
  app.get('/cases/:caseId/attachments', async (request, reply) => {
    // 1. Define o Schema
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    // 2. Faz o parse e atribui a uma variável 'params' primeiro
    const params = paramsSchema.parse(request.params)
    
    // 3. Extrai explicitamente o ID para garantir que a variável exista
    const caseId = params.caseId 

    // Agora é impossível dar ReferenceError
    const attachments = await prisma.anexo.findMany({
      where: { casoId: caseId }, 
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nome: true } } }
    })

    const host = request.protocol + '://' + request.hostname
    
    const serialized = attachments.map(a => ({
      ...a,
      url: `${host}/uploads/${a.url}` 
    }))

    return reply.send(serialized)
  })

  // [POST] Upload de Arquivo
  app.post('/attachments', async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: 'Requisição deve ser multipart/form-data' })
    }

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
    }

    const buffer = await data.toBuffer()
    
    // 1. Validar Magic Number
    const fileType = await validateFileSignature(buffer)
    if (!fileType) {
      return reply.status(400).send({ message: 'Tipo de arquivo inválido. Apenas PDF e Imagens (JPG/PNG).' })
    }

    // 2. Extrair casoId da Query String (Mais seguro)
    const querySchema = z.object({ casoId: z.string().uuid() })
    let casoId: string

    try {
      // O Frontend deve enviar: POST /attachments?casoId=XYZ
      const query = querySchema.parse(request.query)
      casoId = query.casoId
    } catch {
       return reply.status(400).send({ message: 'casoId é obrigatório na Query String (?casoId=uuid)' })
    }

    // 3. Salvar no Disco
    const ext = path.extname(data.filename).toLowerCase()
    const safeFileName = `${randomUUID()}${ext}`
    const filePath = path.join(UPLOAD_DIR, safeFileName)

    try {
      fs.writeFileSync(filePath, buffer)
    } catch (e) {
      return reply.status(500).send({ message: 'Erro ao gravar arquivo no disco.' })
    }

    // 4. Salvar no Banco
    const { sub: userId } = request.user as { sub: string }
    
    const anexo = await prisma.anexo.create({
      data: {
        nome: data.filename,
        tipo: fileType,
        url: safeFileName,
        tamanho: buffer.length,
        casoId,
        autorId: userId
      }
    })

    // 5. Log
    try {
      await prisma.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: LogAction.ANEXO_ADICIONADO,
          descricao: `Anexo adicionado: ${data.filename}`
        }
      })
    } catch (error) {
       console.warn("Falha ao criar log de anexo:", error)
    }

    return reply.status(201).send(anexo)
  })

  // [DELETE] Remover anexo
  app.delete('/attachments/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(request.params)
    const { sub: userId, cargo } = request.user as { sub: string, cargo: Cargo }

    const anexo = await prisma.anexo.findUnique({ where: { id } })
    if (!anexo) return reply.status(404).send({ message: 'Arquivo não encontrado.' })

    if (anexo.autorId !== userId && cargo !== Cargo.Gerente && cargo !== Cargo.Coordenador) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    await prisma.anexo.delete({ where: { id } })

    try {
      const filePath = path.join(UPLOAD_DIR, anexo.url)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (e) { 
      console.warn("Arquivo físico não encontrado ou erro ao apagar:", e) 
    }

    try {
      await prisma.caseLog.create({
        data: {
          casoId: anexo.casoId,
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Anexo removido: ${anexo.nome}`
        }
      })
    } catch (e) {}

    return reply.status(204).send()
  })
}