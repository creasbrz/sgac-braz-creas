// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma' //

// O schema do frontend (caseSchemas.ts) envia 'conteudo'
const createEvolutionBodySchema = z.object({ //
  conteudo: z.string().min(10, 'A evolução deve ter no mínimo 10 caracteres.'), //
})

export async function evolutionRoutes(app: FastifyInstance) { //
  // Hook de autenticação
  app.addHook('onRequest', async (request, reply) => { //
    try {
      await request.jwtVerify() //
    } catch (err) { //
      return reply.status(401).send({ message: 'Não autorizado.' })
    }
  })

  // Rota para buscar evoluções de um caso (GET)
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    try {
      const { caseId } = paramsSchema.parse(request.params)

      const evolutions = await prisma.evolucao.findMany({
        where: { casoId: caseId }, //
        orderBy: { createdAt: 'desc' },
        include: {
          autor: { select: { id: true, nome: true } }, //
        },
      })
      // O frontend (EvolutionsSection.tsx) espera 'conteudo'
      // O banco (schema.prisma) já envia 'conteudo'
      // Nenhuma tradução é necessária.
      return await reply.status(200).send(evolutions)
    } catch (error) {
      console.error('Erro ao buscar evoluções:', error)
      return await reply
        .status(500)
        .send({ message: 'Erro interno ao buscar evoluções.' })
    }
  })

  // Rota para criar uma nova evolução (POST)
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })

    try {
      const { caseId } = paramsSchema.parse(request.params)
      // Valida o corpo (JSON) esperando 'conteudo'
      const data = createEvolutionBodySchema.parse(request.body)
      const { sub: autorId, nome: autorNome } = request.user as { sub: string, nome: string } //

      const newEvolution = await prisma.evolucao.create({ //
        data: {
          // O frontend envia 'conteudo' e o banco espera 'conteudo'
          conteudo: data.conteudo, //
          casoId: caseId, //
          autorId: autorId, //
        },
      })
      
      // Retorna a evolução no formato que o frontend espera
      const evolutionForFrontend = {
          id: newEvolution.id,
          createdAt: newEvolution.createdAt,
          conteudo: newEvolution.conteudo,
          autor: { nome: autorNome ?? 'Usuário' } // Adiciona o autor para o cache
      }
      
      return await reply.status(201).send(evolutionForFrontend)

    } catch (error) {
      console.error('!!!!!!!!!! ERRO 500 AO CRIAR EVOLUÇÃO !!!!!!!!!!')
      console.error('DADOS RECEBIDOS:', request.body)
      console.error('AUTOR ID:', (request.user as { sub: string }).sub)
      console.error('ERRO COMPLETO:', error)
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          message: 'Dados inválidos.',
          errors: error.flatten().fieldErrors
        })
      }

      return await reply
        .status(500)
        .send({ message: 'Erro interno ao criar evolução.' })
    }
  })
}