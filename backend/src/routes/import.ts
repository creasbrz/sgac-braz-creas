// backend/src/routes/import.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { ImportService } from '../services/ImportService'

// Schema de resposta padronizado para sucesso e erro
const importResponseSchema = z.object({
  processed: z.number(),
  created: z.number(),
  errors: z.number(),
  logs: z.array(z.string())
})

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Autenticação e Autorização
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
        200: importResponseSchema,
        400: importResponseSchema, // Retorna logs explicativos em caso de erro do cliente
        500: importResponseSchema  // Retorna logs explicativos em caso de erro do servidor
      }
    }
  }, async (request, reply) => {
    // 1. Leitura do Arquivo (Multipart)
    const data = await request.file()
    
    if (!data) {
      return reply.status(400).send({ 
        processed: 0, created: 0, errors: 0, 
        logs: ['Nenhum arquivo foi enviado.'] 
      })
    }

    try {
      // 2. Preparação dos dados
      const buffer = await data.toBuffer()
      // Verificação mais robusta para CSV
      const isCsv = data.mimetype === 'text/csv' || data.filename.toLowerCase().endsWith('.csv')
      const { sub: userId } = request.user as { sub: string }

      // 3. Processamento via Service
      const result = await ImportService.processImport(buffer, isCsv, userId)
      
      return reply.status(200).send(result)

    } catch (error: any) {
      request.log.error(error)

      // Tratamento de erros de negócio conhecidos
      if (error.message === 'PLANILHA_VAZIA') {
        return reply.status(400).send({ 
          processed: 0, created: 0, errors: 1, 
          logs: ['A planilha está vazia ou possui um formato inválido.'] 
        })
      }

      // Erro genérico de servidor
      return reply.status(500).send({ 
        processed: 0, created: 0, errors: 1, 
        logs: ['Erro crítico ao processar o arquivo. Verifique se o arquivo não está corrompido.'] 
      })
    }
  })
}