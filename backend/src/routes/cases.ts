// backend/src/routes/cases.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { CaseStatus, Cargo } from '@prisma/client'
import { createCaseBodySchema, updateCaseBodySchema } from '../schemas/caseSchema'
import { CaseService } from '../services/CaseService'
import { ExportService } from '../services/ExportService'
import { ImportService } from '../services/ImportService' // Adicionado
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

  // 2. [PUT] EDITAR CASO (Inclui lógica do SEI)
  server.put('/cases/:id', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      // Estendemos o schema aqui caso o arquivo original ainda não tenha os campos, 
      // ou confiamos que updateCaseBodySchema já foi atualizado.
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

      // --- LÓGICA DE CONTROLE DO SEI ---
      // Se o status de resposta foi alterado, manipulamos a data automaticamente
      let extraData: any = {}
      
      if (typeof data.seiRespondido === 'boolean') {
        if (data.seiRespondido === true) {
          extraData.dataRespostaSei = new Date() // Marca agora
        } else {
          extraData.dataRespostaSei = null // Limpa a data
        }
      }

      // Mescla os dados do corpo com a lógica calculada
      const payload = { ...data, ...extraData }

      const updated = await CaseService.update(id, payload, request.user.sub)
      return reply.send(updated)
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ message: 'Caso não encontrado.' })
      throw error
    }
  })

  // 3. [GET] LISTAR CASOS (Com filtros avançados)
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
    const { page, pageSize, sortBy, sortOrder } = request.query
    const { cargo, sub } = request.user as { cargo: string, sub: string }

    const where = CaseService.buildWhereClause(request.query, { cargo, sub })

    let orderBy: any = [{ pesoUrgencia: 'desc' }, { dataEntrada: 'asc' }]
    
    if (sortBy) {
      if (sortBy === 'urgencia') orderBy = { pesoUrgencia: sortOrder || 'desc' }
      else orderBy = { [sortBy]: sortOrder || 'asc' }
    }

    const [items, total] = await Promise.all([
      prisma.case.findMany({
        where, 
        orderBy, 
        take: pageSize, 
        skip: (page - 1) * pageSize,
        include: { 
          agenteAcolhida: { select: { nome: true } }, 
          especialistaPAEFI: { select: { nome: true } } 
        },
      }),
      prisma.case.count({ where }),
    ])

    return reply.send({ 
      data: items, 
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } 
    })
  })

  // 4. [GET] DETALHES COMPLETOS
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

  // 5. [PATCH] MUDAR STATUS
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

  // 6. [PATCH] ATRIBUIR TÉCNICO
  server.patch('/cases/:id/assign', {
    schema: { 
      tags: ['Casos'], 
      params: z.object({ id: z.string().uuid() }), 
      body: z.object({ specialistId: z.string().uuid() }) 
    }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { sub: string, cargo: string }
    
    // Apenas Gerente pode atribuir (ou adapte conforme sua regra)
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })
    
    try {
      const updated = await CaseService.assignSpecialist(request.params.id, request.body.specialistId, sub)
      return reply.send(updated)
    } catch (e) { 
      return reply.status(404).send({ message: 'Caso não encontrado.' }) 
    }
  })

  // 7. [PATCH] DESLIGAR CASO
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

    // Apenas Gerente ou o próprio técnico do caso podem desligar
    const isManager = cargo === Cargo.Gerente
    if (!isManager && caso.agenteAcolhidaId !== sub && caso.especialistaPAEFIId !== sub) {
      return reply.status(403).send({ message: 'Sem permissão.' })
    }

    const updated = await CaseService.closeCase(request.params.id, request.body, sub)
    return reply.send(updated)
  })

  // 8. [GET] EXPORTAR EXCEL
  server.get('/cases/export', {
    schema: { tags: ['Casos'], summary: 'Exportar todos os dados para Excel (.xlsx)' }
  }, async (request, reply) => {
    const { cargo } = request.user as { cargo: string }
    // Apenas Gerente exporta tudo (ou remova se todos puderem)
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

  // 9. [POST] IMPORTAR CASOS (MULTIPART FILE)
  server.post('/cases/import', {
    schema: {
      tags: ['Casos'],
      summary: 'Importar casos em massa via Excel/CSV',
      // Não definimos 'body' aqui pois é multipart manipulado pelo plugin @fastify/multipart
    }
  }, async (request, reply) => {
    const { cargo, sub } = request.user as { sub: string, cargo: string }
    if (cargo !== Cargo.Gerente) return reply.status(403).send({ message: 'Acesso negado.' })

    // Verifica se é multipart
    if (!request.isMultipart()) {
      return reply.status(400).send({ message: 'Arquivo obrigatório (multipart/form-data).' })
    }

    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
      }

      // Converte stream para buffer
      const buffer = await data.toBuffer()
      const isCsv = data.mimetype === 'text/csv' || data.filename.endsWith('.csv')

      // Processa
      const result = await ImportService.processImport(buffer, isCsv, sub)
      
      return reply.send(result)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({ message: 'Erro interno na importação.' })
    }
  })

  // 10. [GET] DOWNLOAD MODELO (TEMPLATE)
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
}