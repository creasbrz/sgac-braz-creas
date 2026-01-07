import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function deliverablesRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch { return reply.status(401).send() }
  })

  // Schemas de Validação
  const paramsSchema = z.object({ caseId: z.string().uuid() })
  const updateParamsSchema = z.object({ id: z.string().uuid() })

  const createBodySchema = z.object({
    tipo: z.string().min(3), 
    observacoes: z.string().optional(),
  })

  const updateStatusSchema = z.object({
    status: z.enum(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE', 'NEGADO']),
    dataEntrega: z.string().datetime().optional()
  })

  // --- ROTA DE CRIAÇÃO (POST) ---
  app.post('/cases/:caseId/deliverables', async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params) // Variável é 'caseId'
    const { tipo, observacoes } = createBodySchema.parse(request.body)
    const userId = (request.user as any).sub

    // 1. Verificações de Integridade
    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado' })

    const usuario = await prisma.user.findUnique({ where: { id: userId } })
    if (!usuario) return reply.status(401).send({ message: 'Usuário inválido.' })

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 2. Cria o Benefício
        const deliverable = await tx.serviceDeliverable.create({
          data: {
            tipo,
            status: 'SOLICITADO',
            observacoes,
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito: coluna 'casoId' recebe variável 'caseId'
            responsavelId: userId,
          },
        })

        // 3. Evolução Automática
        await tx.evolucao.create({
          data: {
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Solicitação de Benefício: ${tipo}. Obs: ${observacoes || '-'}`
          }
        })

        // 4. Log de Auditoria
        await tx.caseLog.create({
          data: {
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            acao: LogAction.ENTREGA_BENEFICIO_CRIADA,
            descricao: `Solicitou benefício: ${tipo}`
          }
        })

        return deliverable
      })

      return reply.status(201).send(result)
    } catch (err) {
      console.error("❌ Erro ao criar benefício:", err)
      return reply.status(500).send({ message: 'Erro ao processar solicitação.' })
    }
  })

  // --- ROTA DE LISTAGEM (GET) ---
  app.get('/cases/:caseId/deliverables', async (request, reply) => {
    const { caseId } = paramsSchema.parse(request.params)

    try {
      const deliverables = await prisma.serviceDeliverable.findMany({
        where: { 
          casoId: caseId // [CORREÇÃO] Mapeamento explícito
        },
        orderBy: { createdAt: 'desc' },
        include: {
          responsavel: { select: { nome: true } }
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
    } catch (err) {
      console.error("❌ Erro ao listar benefícios:", err)
      return reply.status(500).send({ message: 'Erro ao buscar benefícios.' })
    }
  })

  // --- ROTA DE ATUALIZAÇÃO (PATCH) ---
  app.patch('/deliverables/:id', async (request, reply) => {
    const { id } = updateParamsSchema.parse(request.params)
    const { status, dataEntrega } = updateStatusSchema.parse(request.body)
    const userId = (request.user as any).sub

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Atualiza o status
        const updated = await tx.serviceDeliverable.update({
          where: { id },
          data: {
            status,
            dataEntrega: dataEntrega ? new Date(dataEntrega) : undefined
          }
        })

        // 2. Evolução Automática da Mudança de Status
        await tx.evolucao.create({
          data: {
            casoId: updated.casoId, // Aqui usamos o retorno do update, então 'casoId' existe no objeto
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Atualização de Benefício (${updated.tipo}): Status alterado para ${status}.`
          }
        })

        // 3. Log de Auditoria
        await tx.caseLog.create({
          data: {
            casoId: updated.casoId,
            autorId: userId,
            acao: LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
            descricao: `Alterou status do benefício ${updated.tipo} para ${status}`
          }
        })

        return updated
      })

      return reply.send(result)
    } catch (err) {
      console.error("❌ Erro ao atualizar benefício:", err)
      return reply.status(500).send({ message: 'Erro ao atualizar benefício.' })
    }
  })
}