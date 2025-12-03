// backend/src/routes/referrals.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

/**
 * Rotas para gestão de Encaminhamentos (Rede de Proteção).
 */
export async function referralRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // [POST] Criar novo encaminhamento
  app.post('/cases/:caseId/referrals', async (req, reply) => {
    const paramsSchema = z.object({ 
      caseId: z.string().uuid() 
    })
    
    const bodySchema = z.object({
      tipo: z.string().min(3, "O tipo é obrigatório (ex: Saúde, Educação)"),
      instituicao: z.string().min(3, "Informe o nome da instituição"),
      motivo: z.string().min(5, "Descreva o motivo do encaminhamento")
    })

    try {
      // A variável extraída chama-se 'caseId' (da URL)
      const { caseId } = paramsSchema.parse(req.params)
      const { tipo, instituicao, motivo } = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const referral = await prisma.encaminhamento.create({
        data: {
          tipo,
          instituicao,
          motivo,
          // [CORREÇÃO]: Mapeamento explícito. O campo do banco é 'casoId', a variável é 'caseId'
          casoId: caseId, 
          autorId: userId,
          status: "PENDENTE"
        }
      })

      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito também no log
          casoId: caseId,
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Realizou encaminhamento para ${tipo} - ${instituicao}`
        }
      })

      return reply.status(201).send(referral)

    } catch (error) {
      console.error("Erro ao criar encaminhamento:", error)
      return reply.status(500).send({ message: "Erro ao criar encaminhamento." })
    }
  })

  // [GET] Listar encaminhamentos de um caso
  app.get('/cases/:caseId/referrals', async (req, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })

    try {
      const { caseId } = paramsSchema.parse(req.params)

      const referrals = await prisma.encaminhamento.findMany({
        // [CORREÇÃO]: Mapeamento explícito aqui também
        where: { casoId: caseId },
        orderBy: { createdAt: 'desc' },
        include: { 
          autor: { select: { nome: true } }
        }
      })

      return reply.send(referrals)
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao buscar encaminhamentos." })
    }
  })

  // [PATCH] Atualizar encaminhamento (Dar baixa / Contra-referência)
  app.patch('/referrals/:id', async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({
      status: z.enum(['PENDENTE', 'CONCLUIDO', 'NEGADO']),
      retorno: z.string().optional()
    })

    try {
      const { id } = paramsSchema.parse(req.params)
      const { status, retorno } = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const oldRef = await prisma.encaminhamento.findUnique({ where: { id } })
      if (!oldRef) return reply.status(404).send({ message: "Encaminhamento não encontrado." })

      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: new Date()
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId: oldRef.casoId, // Aqui usamos o valor que já veio do banco, então está correto
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Atualizou encaminhamento (${oldRef.instituicao}) para: ${status}`
        }
      })

      return reply.send(updated)
    } catch (error) {
      return reply.status(500).send({ message: "Erro ao atualizar encaminhamento." })
    }
  })
}