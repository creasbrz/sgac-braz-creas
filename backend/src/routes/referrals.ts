import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function referralRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [GET] Listar Encaminhamentos do Caso
  app.get('/cases/:caseId/referrals', async (req, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)

    const referrals = await prisma.encaminhamento.findMany({
      where: { casoId: caseId },
      orderBy: { dataEnvio: 'desc' },
      include: {
        autor: { select: { nome: true } }
      }
    })

    return reply.send(referrals)
  })

  // [POST] Criar Novo Encaminhamento (+ Evolução Automática)
  app.post('/cases/:caseId/referrals', async (req, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    
    const bodySchema = z.object({
      instituicao: z.string().min(2, "Informe a instituição de destino"),
      tipo: z.string().min(2, "Informe o tipo (Ex: Saúde, Educação)"),
      motivo: z.string().min(5, "Descreva o motivo do encaminhamento"),
    })

    const { caseId } = paramsSchema.parse(req.params)
    const { instituicao, tipo, motivo } = bodySchema.parse(req.body)
    const userId = (req.user as any).sub

    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado' })

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Cria o Encaminhamento
        const referral = await tx.encaminhamento.create({
          data: {
            instituicao,
            tipo,
            motivo,
            status: 'PENDENTE',
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            dataEnvio: new Date()
          }
        })

        // 2. Gera Evolução Automática
        await tx.evolucao.create({
          data: {
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA] Encaminhamento realizado para: ${instituicao} (${tipo}). Motivo: ${motivo}.`
          }
        })

        // 3. Log de Auditoria
        await tx.caseLog.create({
          data: {
            casoId: caseId, // [CORREÇÃO] Mapeamento explícito
            autorId: userId,
            acao: 'OUTRO', 
            descricao: `Encaminhou para: ${instituicao} (${tipo})`
          }
        })

        return referral
      })

      return reply.status(201).send(result)

    } catch (error) {
      console.error("❌ Erro ao criar encaminhamento:", error)
      return reply.status(500).send({ message: 'Erro ao processar encaminhamento.' })
    }
  })

  // [PATCH] Atualizar Status (Feedback da Rede)
  app.patch('/referrals/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
      retorno: z.string().optional()
    })

    const { id } = paramsSchema.parse(req.params)
    const { status, retorno } = bodySchema.parse(req.body)

    const updated = await prisma.encaminhamento.update({
      where: { id },
      data: {
        status,
        retorno,
        updatedAt: new Date()
      }
    })

    return reply.send(updated)
  })

  // [DELETE] Excluir Encaminhamento
  app.delete('/referrals/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const userId = (req.user as any).sub

    const existing = await prisma.encaminhamento.findUnique({ where: { id } })
    if (!existing) return reply.status(404).send()

    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: 'Apenas o autor pode excluir.' })
    }

    await prisma.encaminhamento.delete({ where: { id } })
    
    return reply.status(204).send()
  })
}