// backend/src/routes/import.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { ImportService } from '../services/ImportService'

// Schema de resposta de SUCESSO
const importResponseSchema = z.object({
  processed: z.number(),
  created: z.number(),
  errors: z.number(),
  logs: z.array(z.string())
})

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      
      if (cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Acesso restrito à Gerência.' })
      }
    } catch (err) {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  server.post('/import/cases', {
    schema: {
      tags: ['Importação'],
      summary: 'Importar planilha completa de casos (Excel/CSV)',
      consumes: ['multipart/form-data'],
      response: {
        // [CORREÇÃO] Apenas validamos estritamente o sucesso (200).
        // Removemos 400 e 500 daqui para permitir que o Fastify envie
        // erros nativos (como "File too large" ou erros de conexão) sem travar.
        200: importResponseSchema
      }
    }
  }, async (request, reply) => {
    
    // [CORREÇÃO] Movemos tudo para dentro do TRY para capturar erros de upload
    try {
      // 1. Leitura do Arquivo (Multipart)
      const data = await request.file()
      
      if (!data) {
        // Retornamos o formato esperado manualmente, mas sem forçar no schema global
        return reply.status(400).send({ 
          processed: 0, created: 0, errors: 0, 
          logs: ['Nenhum arquivo foi enviado.'] 
        })
      }

      // 2. Preparação dos dados
      const buffer = await data.toBuffer()
      const isCsv = data.mimetype === 'text/csv' || data.filename.toLowerCase().endsWith('.csv')
      const { sub: userId } = request.user as { sub: string }

      // 3. Processamento via Service
      const result = await ImportService.processImport(buffer, isCsv, userId)
      
      return reply.status(200).send(result)

    } catch (error: any) {
      request.log.error(error)

      // Se for um erro conhecido nosso, mantemos o padrão visual bonito
      if (error.message === 'PLANILHA_VAZIA') {
        return reply.status(400).send({ 
          processed: 0, created: 0, errors: 1, 
          logs: ['A planilha está vazia ou possui um formato inválido.'] 
        })
      }

      // Se for erro de limite de arquivo do Fastify (ex: arquivo muito grande)
      if (error.code === 'FST_FILES_LIMIT' || error.code === 'FST_PARTS_LIMIT') {
        return reply.status(400).send({ 
            processed: 0, created: 0, errors: 1, 
            logs: ['O arquivo é muito grande ou excedeu os limites de upload.'] 
        })
      }

      // Erro genérico (Crash, Banco fora do ar, etc)
      // Agora que removemos o schema do 500, isso não vai mais quebrar a aplicação
      return reply.status(500).send({ 
        processed: 0, created: 0, errors: 1, 
        logs: [`Erro crítico no servidor: ${error.message || 'Desconhecido'}`] 
      })
    }
  })
}