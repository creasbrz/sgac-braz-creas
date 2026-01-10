// backend/src/routes/referrals.ts
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

// --- Schemas Reutilizáveis ---

const referralResponseSchema = z.object({
  id: z.string().uuid(),
  instituicao: z.string(),
  tipo: z.string(),
  motivo: z.string(),
  status: z.string(),
  retorno: z.string().nullable().optional(),
  dataEnvio: z.date(),
  autor: z.object({
    nome: z.string()
  }).optional()
})

export async function referralRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  // Middleware de Autenticação
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] Listar Encaminhamentos do Caso
  server.get('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Listar histórico de encaminhamentos externos',
      params: z.object({ caseId: z.string().uuid() }),
      response: {
        200: z.array(referralResponseSchema)
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params

    const referrals = await prisma.encaminhamento.findMany({
      // CORREÇÃO: Mapeamento explícito (banco: variável)
      where: { casoId: caseId }, 
      orderBy: { dataEnvio: 'desc' },
      include: {
        autor: { select: { nome: true } }
      }
    })

    return reply.send(referrals)
  })

  // 2. [POST] Criar Encaminhamento (+ Evolução Automática + Log)
  server.post('/cases/:caseId/referrals', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Registrar novo encaminhamento para a rede',
      params: z.object({ caseId: z.string().uuid() }),
      body: z.object({
        instituicao: z.string().min(2, "Informe a instituição de destino"),
        tipo: z.string().min(2, "Informe o tipo (Ex: Saúde, Educação)"),
        motivo: z.string().min(5, "Descreva o motivo do encaminhamento"),
      }),
      response: {
        201: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { caseId } = req.params
    const { instituicao, tipo, motivo } = req.body
    const { sub: userId } = req.user as { sub: string }

    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) return reply.status(404).send({ message: 'Caso não encontrado' })

    try {
      // Transaction garante consistência: Cria Encaminhamento E Evolução E Log
      const result = await prisma.$transaction(async (tx) => {
        // 1. Cria o Encaminhamento
        const referral = await tx.encaminhamento.create({
          data: {
            instituicao,
            tipo,
            motivo,
            status: 'PENDENTE',
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            dataEnvio: new Date()
          },
          include: { autor: { select: { nome: true } } }
        })

        // 2. Gera Evolução Automática (Registro no Prontuário)
        await tx.evolucao.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA - ENCAMINHAMENTO] Realizado para: ${instituicao} (${tipo}).\nMotivo: ${motivo}.`
          }
        })

        // 3. Log de Auditoria
        await tx.caseLog.create({
          data: {
            // CORREÇÃO: Mapeamento explícito
            casoId: caseId,
            autorId: userId,
            acao: LogAction.OUTRO,
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

  // 3. [PATCH] Atualizar Status (Feedback/Contrarreferência)
  server.patch('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Atualizar status ou registrar contrarreferência',
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
        retorno: z.string().optional()
      }),
      response: {
        200: referralResponseSchema
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { status, retorno } = req.body

    try {
      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: {
          status,
          retorno,
          updatedAt: new Date()
        },
        include: { autor: { select: { nome: true } } }
      })

      return reply.send(updated)
    } catch (error) {
      return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })
    }
  })

  // 4. [DELETE] Excluir Encaminhamento (Apenas Autor)
  server.delete('/referrals/:id', {
    schema: {
      tags: ['Encaminhamentos'],
      summary: 'Remover um encaminhamento (Apenas Autor)',
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.null()
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { sub: userId } = req.user as { sub: string }

    const existing = await prisma.encaminhamento.findUnique({ where: { id } })
    
    if (!existing) return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })

    if (existing.autorId !== userId) {
      return reply.status(403).send({ message: 'Apenas o autor pode excluir este registro.' })
    }

    await prisma.encaminhamento.delete({ where: { id } })
    
    return reply.status(204).send()
  })
}