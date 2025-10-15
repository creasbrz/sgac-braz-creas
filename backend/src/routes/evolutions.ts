// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function evolutionRoutes(app: FastifyInstance) {
  // Rota para listar todas as evoluções de um caso
  app.get(
    '/cases/:caseId/evolutions',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })
      try {
        const { caseId } = paramsSchema.parse(request.params)

        const evolutions = await prisma.evolucao.findMany({
          where: { casoId: caseId }, // Correção: Mapeia para o campo `casoId` do schema
          orderBy: { createdAt: 'desc' },
          include: {
            autor: { select: { nome: true } },
          },
        })

        return await reply.status(200).send(evolutions)
      } catch (error) {
        request.log.error(error, 'Erro ao listar evoluções.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao buscar evoluções.' })
      }
    },
  )

  // Rota para criar uma nova evolução
  app.post(
    '/cases/:caseId/evolutions',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ caseId: z.string().uuid() })
      const bodySchema = z.object({
        conteudo: z
          .string()
          .min(10, 'A evolução deve ter no mínimo 10 caracteres.'),
      })

      try {
        const { caseId } = paramsSchema.parse(request.params)
        const { conteudo } = bodySchema.parse(request.body)
        const { sub: autorId } = request.user

        const newEvolution = await prisma.evolucao.create({
          data: {
            conteudo,
            casoId: caseId, // Correção: Mapeia a variável `caseId` para o campo `casoId`
            autorId,
          },
        })

        return await reply.status(201).send(newEvolution)
      } catch (error) {
        request.log.error(error, 'Erro ao criar evolução.')
        return await reply
          .status(500)
          .send({ message: 'Erro interno ao criar evolução.' })
      }
    },
  )
}

