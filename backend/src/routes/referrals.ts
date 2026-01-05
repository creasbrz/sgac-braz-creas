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
      where: { casoId: caseId }, // Nome correto do campo no banco
      orderBy: { dataEnvio: 'desc' },
      include: {
        autor: { select: { nome: true } }
      }
    })

    return reply.send(referrals)
  })

  // [POST] Criar Novo Encaminhamento
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

    // Verifica se o caso existe
    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado' })

    const referral = await prisma.encaminhamento.create({
      data: {
        instituicao,
        tipo,
        motivo,
        status: 'PENDENTE',
        casoId: caseId,
        autorId: userId,
        dataEnvio: new Date()
      }
    })

    // Auditoria
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: 'OUTRO', // Ou crie um enum ENCAMINHAMENTO_CRIADO se puder alterar o schema
        descricao: `Encaminhou para: ${instituicao} (${tipo})`
      }
    })

    return reply.status(201).send(referral)
  })

  // [PATCH] Atualizar Status (Feedback da Rede)
  app.patch('/referrals/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
      retorno: z.string().optional() // Texto com a resposta da instituição
    })

    const { id } = paramsSchema.parse(req.params)
    const { status, retorno } = bodySchema.parse(req.body)

    const updated = await prisma.encaminhamento.update({
      where: { id },
      data: {
        status,
        retorno, // Salva o feedback (Ex: "Vaga concedida")
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

    // Trava: Apenas autor deleta
    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: 'Apenas o autor pode excluir.' })
    }

    await prisma.encaminhamento.delete({ where: { id } })
    
    return reply.status(204).send()
  })
}