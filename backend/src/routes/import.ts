// backend/src/routes/import.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { Cargo } from '@prisma/client'
import { ImportService } from '../services/ImportService'

export async function importRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      const { cargo } = request.user as { cargo: string }
      if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso restrito à Gerência.' })
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  server.post('/import/cases', {
    schema: {
      tags: ['Importação'],
      summary: 'Importar planilha completa de casos (Excel/CSV)',
      response: {
        200: z.object({
          processed: z.number(),
          created: z.number(),
          errors: z.number(),
          logs: z.array(z.string())
        })
      }
    }
  }, async (request, reply) => {
    // 1. Leitura do Arquivo (Multipart)
    const data = await request.file()
    
    if (!data) {
      return reply.status(400).send({ processed: 0, created: 0, errors: 0, logs: ['Arquivo não enviado.'] })
    }

    try {
      // 2. Prepara dados para o Service
      const buffer = await data.toBuffer()
      const isCsv = data.mimetype.includes('csv') || data.filename.toLowerCase().endsWith('.csv')
      const userId = (request.user as any).sub

      // 3. Delega processamento
      const result = await ImportService.processImport(buffer, isCsv, userId)
      
      return reply.send(result)

    } catch (error: any) {
      if (error.message === 'PLANILHA_VAZIA') {
        return reply.status(400).send({ processed: 0, created: 0, errors: 1, logs: ['Planilha vazia ou formato inválido.'] })
      }

      request.log.error(error)
      return reply.status(500).send({ 
        processed: 0, created: 0, errors: 0, 
        logs: ['Erro crítico ao processar o arquivo. Verifique o formato.'] 
      })
    }
  })
}