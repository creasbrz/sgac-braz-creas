// backend/src/routes/paf.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function pafRoutes(app: FastifyInstance) {
  // Rota para buscar o PAF de um caso
  app.get(
    '/cases/:caseId/paf',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })
      try {
        const { caseId } = paramsSchema.parse(request.params)
        // Correção: usa 'paf' em minúsculas para corresponder ao cliente Prisma
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          include: { autor: { select: { nome: true } } },
        })
        return await reply.status(200).send(paf)
      } catch (error) {
        request.log.error(error, 'Erro ao buscar PAF.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao buscar PAF.' })
      }
    },
  )

  // Rota para criar um PAF para um caso
  app.post(
    '/cases/:caseId/paf',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })
      const bodySchema = z.object({
        diagnostico: z.string().min(10),
        objetivos: z.string().min(10),
        estrategias: z.string().min(10),
        prazos: z.string().min(10),
      })

      try {
        const { caseId } = paramsSchema.parse(request.params)
        const data = bodySchema.parse(request.body)
        const { sub: autorId, cargo } = request.user

        if (cargo !== 'Especialista' && cargo !== 'Gerente') {
          return await reply
            .status(403)
            .send({ message: 'Apenas especialistas podem criar um PAF.' })
        }

        // Correção: usa 'paf' em minúsculas para corresponder ao cliente Prisma
        const newPaf = await prisma.paf.create({
          data: {
            ...data,
            casoId,
            autorId,
          },
        })

        return await reply.status(201).send(newPaf)
      } catch (error) {
        request.log.error(error, 'Erro ao criar PAF.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao criar PAF.' })
      }
    },
  )
}

