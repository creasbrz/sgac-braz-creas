// backend/src/routes/cases.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CaseStatus } from '@prisma/client'
import { createCaseBodySchema, updateCaseBodySchema } from '../schemas/caseSchema'
import { CaseController } from '../controllers/CaseController' // [V2.0]
import { ExportService } from '../services/ExportService'
import { ImportService } from '../services/ImportService'
import { Cargo } from '@prisma/client'
import { format } from 'date-fns'

export async function caseRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Autenticação
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } 
    catch (err) { await reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // --- CRUD CORE (Via Controller) ---

  server.post('/cases', {
    schema: { tags: ['Casos'], body: createCaseBodySchema }
  }, CaseController.create)

  server.get('/cases', {
    schema: {
      tags: ['Casos'],
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().min(1).default(1),
        pageSize: z.coerce.number().min(1).max(100).default(10),
        status: z.string().optional(), 
        urgencia: z.string().optional(),
        violacao: z.string().optional(),
        categoria: z.string().optional(),
        sexo: z.string().optional(),
        view: z.enum(['my', 'all']).default('my').optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        agenteId: z.string().uuid().optional(),
        specialistId: z.string().uuid().optional(),
      })
    }
  }, CaseController.list)

  server.get('/cases/:id', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }) }
  }, CaseController.getById)

  server.put('/cases/:id', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: updateCaseBodySchema.extend({
        seiRespondido: z.boolean().optional(),
        linkSei: z.string().optional().nullable(),
        numeroSei: z.string().optional().nullable()
      })
    }
  }, CaseController.update)

  // --- ACTIONS (Via Controller) ---

  server.patch('/cases/:id/status', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ status: z.nativeEnum(CaseStatus) }) 
    }
  }, CaseController.updateStatus)

  server.patch('/cases/:id/assign', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ specialistId: z.string().uuid() }) 
    }
  }, CaseController.assignSpecialist)

  server.patch('/cases/:id/close', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ 
        parecerFinal: z.string().min(10), 
        motivoDesligamento: z.string().min(1), 
        destinoDesligamento: z.string().optional() 
      }) 
    }
  }, CaseController.closeCase)

  // --- FEATURES ESPECIAIS (Mantidas aqui por simplicidade ou refatorar para ImportExportController futuramente) ---
  
  // [GET] CASOS FECHADOS
  server.get('/cases/closed', {
    schema: {
      tags: ['Casos'],
      summary: 'Listar casos desligados (Arquivo Morto)',
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(10),
        view: z.string().optional(),
      })
    }
  }, CaseController.list) // Reutiliza o list com filtro injetado no frontend

  // [GET] EXPORTAR EXCEL
  server.get('/cases/export', {
    schema: { tags: ['Casos'], summary: 'Exportar todos os dados para Excel (.xlsx)' }
  }, async (req, reply) => {
    const { cargo } = req.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    try {
      const buffer = await ExportService.generateCasesExcel()
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="Exportacao_Casos_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`)
      return reply.send(buffer)
    } catch (error) {
      req.log.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar excel.' })
    }
  })

  // [GET] DOWNLOAD MODELO IMPORTAÇÃO
  server.get('/cases/import/template', {
    schema: { tags: ['Casos'], summary: 'Baixar planilha modelo para importação' }
  }, async (req, reply) => {
    const buffer = await ExportService.generateTemplate() 
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename="Modelo_Importacao_Casos.xlsx"`)
    return reply.send(buffer)
  })

  // [POST] IMPORTAR CASOS
  server.post('/cases/import', {
    schema: { tags: ['Casos'], summary: 'Importar casos em massa via Excel/CSV' }
  }, async (req, reply) => {
    const { cargo, sub } = req.user as { sub: string, cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    if (!req.isMultipart()) {
      return reply.status(400).send({ message: 'Arquivo obrigatório (multipart/form-data).' })
    }

    const data = await req.file()
    if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })

    const buffer = await data.toBuffer()
    const isCsv = data.mimetype === 'text/csv' || data.filename.endsWith('.csv')

    const result = await ImportService.processImport(buffer, isCsv, sub)
    return reply.send(result)
  })
}