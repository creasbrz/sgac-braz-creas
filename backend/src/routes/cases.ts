// backend/src/routes/cases.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CaseStatus, Cargo } from '@prisma/client'
import { createCaseBodySchema, updateCaseBodySchema } from '../schemas/caseSchema'
import { CaseService } from '../services/CaseService'
import { ExportService } from '../services/ExportService'
import { ImportService } from '../services/ImportService'
import { format } from 'date-fns'

export async function caseRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  // Middleware de Autenticação Global para estas rotas
  server.addHook('onRequest', async (request, reply) => {
    try { 
      await request.jwtVerify() 
    } catch (err) { 
      await reply.status(401).send({ message: 'Não autorizado' }) 
    }
  })

  // 1. [POST] CRIAR CASO
  server.post('/cases', {
    schema: { 
      tags: ['Casos'], 
      body: createCaseBodySchema 
    }
  }, async (request, reply) => {
    try {
      const newCase = await CaseService.create(request.body, request.user.sub)
      return reply.status(201).send(newCase)
    } catch (error: any) {
      if (error.message === 'CPF_ALREADY_EXISTS') {
        return reply.status(409).send({ message: 'CPF já cadastrado.' })
      }
      throw error
    }
  })

  // 2. [GET] LISTAR CASOS (Geral)
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
  }, async (request, reply) => {
    // Refatorado para usar o método centralizado no Service
    const result = await CaseService.findAll(request.query, request.user)
    return reply.send(result)
  })

  // 3. [GET] CASOS FECHADOS (Arquivo Morto) 
  // [IMPORTANTE] Esta rota deve vir ANTES de /cases/:id para não dar erro de UUID
  server.get('/cases/closed', {
    schema: {
      tags: ['Casos'],
      summary: 'Listar casos desligados (Arquivo Morto)',
      querystring: z.object({
        search: z.string().optional(),
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(10),
        view: z.string().optional(), // Aceita view para compatibilidade com frontend
        // Adicione outros filtros se necessário
      })
    }
  }, async (request, reply) => {
    // Força o status e a view para buscar desligados
    const params = {
      ...request.query,
      view: 'all',
      status: 'DESLIGADO'
    }
    
    const result = await CaseService.findAll(params, request.user)
    return reply.send(result)
  })

  // 4. [GET] EXPORTAR EXCEL (Movido para cima para evitar colisão)
  server.get('/cases/export', {
    schema: { tags: ['Casos'], summary: 'Exportar todos os dados para Excel (.xlsx)' }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    try {
      const buffer = await ExportService.generateCasesExcel()

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="Exportacao_Casos_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`)
      
      return reply.send(buffer)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar excel.' })
    }
  })

  // 5. [GET] DOWNLOAD MODELO (Movido para cima)
  server.get('/cases/import/template', {
    schema: { tags: ['Casos'], summary: 'Baixar planilha modelo para importação' }
  }, async (request, reply) => {
    try {
      const buffer = await ExportService.generateTemplate() 

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="Modelo_Importacao_Casos.xlsx"`)
      
      return reply.send(buffer)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro ao gerar template.' })
    }
  })

  // 6. [GET] DETALHES COMPLETOS (Rota com parâmetro ID)
  server.get('/cases/:id', {
    schema: { tags: ['Casos'], params: z.object({ id: z.string().uuid() }) }
  }, async (request, reply) => {
    try {
        const caso = await CaseService.getCaseWithEconomics(request.params.id)
        if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })
        return reply.send(caso)
    } catch (error) {
        throw error
    }
  })

  // 7. [PUT] EDITAR CASO
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
  }, async (request, reply) => {
    try {
      const { id } = request.params
      const data = request.body

      let extraData: any = {}
      
      if (typeof data.seiRespondido === 'boolean') {
        if (data.seiRespondido === true) {
          extraData.dataRespostaSei = new Date()
        } else {
          extraData.dataRespostaSei = null
        }
      }

      const payload = { ...data, ...extraData }

      const updated = await CaseService.update(id, payload, request.user.sub)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      throw error
    }
  })

  // 8. [PATCH] MUDAR STATUS
  server.patch('/cases/:id/status', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ status: z.nativeEnum(CaseStatus) }) 
    }
  }, async (request, reply) => {
    try {
      const updated = await CaseService.updateStatus(request.params.id, request.body.status, request.user.sub)
      return reply.send(updated)
    } catch (e) { 
      return reply.status(404).send({ message: 'Caso não encontrado.' }) 
    }
  })

  // 9. [PATCH] ATRIBUIR TÉCNICO
  server.patch('/cases/:id/assign', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ specialistId: z.string().uuid() }) 
    }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { sub: string, cargo: string }
    
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    
    try {
      const updated = await CaseService.assignSpecialist(request.params.id, request.body.specialistId, sub)
      return reply.send(updated)
    } catch (e) { 
      return reply.status(404).send({ message: 'Caso não encontrado.' }) 
    }
  })

  // 10. [PATCH] DESLIGAR CASO
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
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { sub: string, cargo: string }
    
    const caso = await prisma.case.findUnique({ 
      where: { id: request.params.id }, 
      select: { agenteAcolhidaId: true, especialistaPAEFIId: true } 
    })
    
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

    const isManager = cargo === Cargo.Gerente
    if (!isManager && caso.agenteAcolhidaId !== sub && caso.especialistaPAEFIId !== sub) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    const updated = await CaseService.closeCase(request.params.id, request.body, sub)
    return reply.send(updated)
  })

  // 11. [POST] IMPORTAR CASOS
  server.post('/cases/import', {
    schema: {
      tags: ['Casos'],
      summary: 'Importar casos em massa via Excel/CSV',
    }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { sub: string, cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    if (!request.isMultipart()) {
      return reply.status(400).send({ message: 'Arquivo obrigatório (multipart/form-data).' })
    }

    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      const buffer = await data.toBuffer()
      const isCsv = data.mimetype === 'text/csv' || data.filename.endsWith('.csv')

      const result = await ImportService.processImport(buffer, isCsv, sub)
      
      return reply.send(result)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro interno na importação.' })
    }
  })
}