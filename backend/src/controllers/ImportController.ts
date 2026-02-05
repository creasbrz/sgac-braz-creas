// backend/src/controllers/ImportController.ts
import { FastifyReply, FastifyRequest } from 'fastify'
import { ImportService } from '../services/ImportService'
import { Cargo } from '@prisma/client'

export class ImportController {
  
  static async importCases(req: FastifyRequest, reply: FastifyReply) {
    // 1. Verificação de Permissão (Apenas Gerente)
    const { cargo, sub } = req.user as { sub: string, cargo: string }
    
    if (cargo !== Cargo.Gerente) {
      return reply.status(403).send({ message: 'Acesso negado. Apenas gerentes podem importar dados.' })
    }

    // 2. Verificação de Multipart
    if (!req.isMultipart()) {
      return reply.status(400).send({ message: 'O arquivo deve ser enviado como multipart/form-data.' })
    }

    try {
      // 3. Leitura do Arquivo
      const data = await req.file()
      
      if (!data) {
        return reply.status(400).send({ 
          processed: 0, created: 0, errors: 0, 
          logs: ['Nenhum arquivo foi enviado.'] 
        })
      }

      // 4. Bufferização e Validação Básica
      const buffer = await data.toBuffer()
      const isCsv = data.mimetype === 'text/csv' || data.filename.toLowerCase().endsWith('.csv')

      // 5. Processamento via Service
      const result = await ImportService.processImport(buffer, isCsv, sub)
      
      return reply.status(200).send(result)

    } catch (error: any) {
      req.log.error(error)

      // Tratamento de Erros Específicos
      if (error.message === 'PLANILHA_VAZIA') {
        return reply.status(400).send({ 
          processed: 0, created: 0, errors: 1, 
          logs: ['A planilha está vazia ou possui um formato inválido.'] 
        })
      }

      if (error.code === 'FST_FILES_LIMIT' || error.code === 'FST_PARTS_LIMIT') {
        return reply.status(400).send({ 
            processed: 0, created: 0, errors: 1, 
            logs: ['O arquivo é muito grande ou excedeu os limites de upload.'] 
        })
      }

      // Erro genérico
      return reply.status(500).send({ 
        processed: 0, created: 0, errors: 1, 
        logs: [`Erro crítico no servidor: ${error.message || 'Desconhecido'}`] 
      })
    }
  }
}