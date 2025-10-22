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
        const paf = await prisma.paf.findUnique({
          where: { casoId: caseId },
          include: { autor: { select: { id: true, nome: true } } },
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

  const pafBodySchema = z.object({
    diagnostico: z.string().min(10),
    objetivos: z.string().min(10),
    estrategias: z.string().min(10),
    prazos: z.string().min(5),
  })

  // Rota para criar um PAF para um caso
  app.post(
    '/cases/:caseId/paf',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })
      try {
        const { caseId } = paramsSchema.parse(request.params)
        const data = pafBodySchema.parse(request.body)
        const { sub: autorId, cargo } = request.user

        if (cargo !== 'Especialista' && cargo !== 'Gerente') {
          return await reply
            .status(403)
            .send({ message: 'Apenas especialistas podem criar um PAF.' })
        }

        const newPaf = await prisma.paf.create({
          data: {
            ...data,
            casoId: caseId, // Correção: Usar a variável `caseId` aqui
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

  // Rota: Atualizar (Editar) um PAF existente
  app.put(
    '/cases/:caseId/paf',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })

      try {
        const { caseId } = paramsSchema.parse(request.params)
        const data = pafBodySchema.parse(request.body)
        const { sub: userId, cargo } = request.user

        const existingPaf = await prisma.paf.findUnique({
          where: { casoId: caseId }, // Correção: Usar a variável `caseId` aqui
        })

        if (!existingPaf) {
          return await reply.status(404).send({ message: 'PAF não encontrado.' })
        }

        if (existingPaf.autorId !== userId && cargo !== 'Gerente') {
          return await reply.status(403).send({ message: 'Apenas o autor ou um gerente podem editar este PAF.' })
        }

        const updatedPaf = await prisma.paf.update({
          where: { casoId: caseId }, // Correção: Usar a variável `caseId` aqui
          data: {
            ...data,
            updatedAt: new Date(),
          },
        })

        return await reply.status(200).send(updatedPaf)
      } catch (error) {
        request.log.error(error, 'Erro ao atualizar PAF.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao atualizar PAF.' })
      }
    },
  )
}