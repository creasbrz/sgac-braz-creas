import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function deliverablesRoutes(app: FastifyInstance) {
  
  // Middleware de Autenticação
  app.addHook('onRequest', async (request) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      // Em dev, pode passar sem token se necessário, mas ideal é logar
    }
  })

  // Validação do parâmetro da URL
  const paramsSchema = z.object({
    caseId: z.string().uuid(),
  })

  // Validação do Body (Criação)
  const createDeliverableBodySchema = z.object({
    tipo: z.string().min(3, "Selecione um tipo de benefício"), 
    observacoes: z.string().optional(),
  })

  // Validação do Body (Atualização de Status)
  const updateStatusSchema = z.object({
    status: z.enum(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE', 'NEGADO']),
    dataEntrega: z.string().datetime().optional()
  })

  const updateParamsSchema = z.object({
    id: z.string().uuid()
  })

  // --- ROTA DE CRIAÇÃO (POST) ---
  app.post('/cases/:caseId/deliverables', async (request, reply) => {
    // 1. Pegamos o ID da URL (aqui chama 'caseId' pois definimos na rota '/cases/:caseId')
    const { caseId } = paramsSchema.parse(request.params)
    const { tipo, observacoes } = createDeliverableBodySchema.parse(request.body)

    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado' })

    // Pega usuário logado ou fallback
    let responsavelId = request.user?.sub
    if (!responsavelId) {
      const fallbackUser = await prisma.user.findFirst()
      responsavelId = fallbackUser?.id || 'id-nao-encontrado'
    }

    // 2. Criamos usando 'casoId' (Português) para bater com o Schema
    const deliverable = await prisma.serviceDeliverable.create({
      data: {
        tipo: tipo,
        status: 'SOLICITADO',
        observacoes: observacoes,
        casoId: caseId, // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
        responsavelId: responsavelId,
      },
    })

    return reply.status(201).send(deliverable)
  })

  // --- ROTA DE LISTAGEM (GET) ---
  app.get('/cases/:caseId/deliverables', async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params)

    const deliverables = await prisma.serviceDeliverable.findMany({
      where: { 
        casoId: caseId // <--- CORREÇÃO AQUI: O campo no banco é 'casoId'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        responsavel: {
          select: { nome: true }
        }
      }
    })

    const response = deliverables.map(d => ({
      id: d.id,
      tipo: d.tipo,
      status: d.status,
      dataSolicitacao: d.dataSolicitacao,
      dataEntrega: d.dataEntrega,
      responsavel: { nome: d.responsavel.nome }
    }))

    return reply.send(response)
  })

  // --- ROTA DE ATUALIZAÇÃO (PATCH) ---
  app.patch('/deliverables/:id', async (request, reply) => {
    const { id } = updateParamsSchema.parse(request.params)
    const { status, dataEntrega } = updateStatusSchema.parse(request.body)

    const updated = await prisma.serviceDeliverable.update({
      where: { id },
      data: {
        status,
        dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined
      }
    })

    return reply.send(updated)
  })
}