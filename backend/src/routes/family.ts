// backend/src/routes/family.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

export async function familyRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [POST] Adicionar membro da família
  app.post('/cases/:caseId/family', async (req, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    const bodySchema = z.object({
      nome: z.string().min(2),
      parentesco: z.string().min(2),
      idade: z.number().int().nonnegative().optional(),
      // [NOVOS CAMPOS]
      cpf: z.string().optional().nullable(),
      nascimento: z.coerce.date().optional().nullable(),
      telefone: z.string().optional().nullable(),
      
      ocupacao: z.string().optional(),
      renda: z.number().nonnegative().optional(),
      observacoes: z.string().optional()
    })

    try {
      const { caseId } = paramsSchema.parse(req.params)
      const data = bodySchema.parse(req.body)
      const userId = (req.user as any).sub

      const cpfLimpo = data.cpf ? data.cpf.replace(/\D/g, '') : null
      const telefoneLimpo = data.telefone ? data.telefone.replace(/\D/g, '') : null

      const member = await prisma.membroFamilia.create({
        data: {
          ...data,
          cpf: cpfLimpo,
          telefone: telefoneLimpo,
          // [CORREÇÃO]: Mapeamento explícito (banco: variável)
          casoId: caseId
        }
      })

      await prisma.caseLog.create({
        data: {
          // [CORREÇÃO]: Mapeamento explícito aqui também
          casoId: caseId,
          autorId: userId,
          acao: LogAction.MEMBRO_FAMILIA_ADICIONADO,
          descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
        }
      })

      return reply.status(201).send(member)
    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao adicionar familiar.' })
    }
  })

  // [GET] Listar família
  app.get('/cases/:caseId/family', async (req, reply) => {
    const { caseId } = z.object({ caseId: z.string().uuid() }).parse(req.params)
    const members = await prisma.membroFamilia.findMany({
      // [CORREÇÃO]: Mapeamento explícito
      where: { casoId: caseId },
      orderBy: { createdAt: 'asc' } 
    })
    return reply.send(members)
  })

  // [DELETE] Remover familiar
  app.delete('/family/:id', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const userId = (req.user as any).sub
    
    try {
      const member = await prisma.membroFamilia.findUnique({ where: { id } })
      if (!member) return reply.status(404).send()

      await prisma.membroFamilia.delete({ where: { id } })

      await prisma.caseLog.create({
        data: {
          casoId: member.casoId, // Aqui 'member' vem do banco, então já tem 'casoId' correto
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Removeu familiar: ${member.nome}`
        }
      })
      
      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send()
    }
  })
}