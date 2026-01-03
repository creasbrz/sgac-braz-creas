// backend/src/routes/evolutions.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo, LogAction } from '@prisma/client'

interface UserPayload {
  sub: string
  nome: string
  cargo: Cargo
}

export async function evolutionRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } catch (err) { await reply.status(401).send(err) }
  })

  // 1. CRIAR EVOLUÇÃO (Restaurado para usar URL param)
  // Rota: POST /cases/:caseId/evolutions
  app.post('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    const bodySchema = z.object({
      conteudo: z.string().min(3, "Escreva algo relevante."),
      sigilo: z.boolean().default(false),
    })

    try {
      // Pega o ID do CASO direto da URL (mais seguro que do corpo)
      const { caseId } = paramsSchema.parse(request.params)
      const { conteudo, sigilo } = bodySchema.parse(request.body)
      const user = request.user as UserPayload

      // Verifica se o caso existe
      const caso = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

      // Cria a evolução vinculada ao ID da URL
      const evolucao = await prisma.evolucao.create({
        data: {
          conteudo,
          sigilo,
          casoId: caseId, // Vínculo garantido
          autorId: user.sub,
        },
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      })

      // Log e atualização de timestamp
      await prisma.caseLog.create({
        data: {
          casoId: caseId,
          autorId: user.sub,
          acao: LogAction.EVOLUCAO_CRIADA,
          descricao: sigilo ? 'Evolução Sigilosa.' : 'Evolução Técnica.',
        }
      })

      await prisma.case.update({
        where: { id: caseId },
        data: { updatedAt: new Date() }
      })

      return reply.status(201).send(evolucao)

    } catch (error) {
      console.error("Erro POST Evolução:", error)
      return reply.status(500).send({ message: 'Erro ao criar evolução.' })
    }
  })

  // 2. LISTAR EVOLUÇÕES (Filtros Ajustados)
  app.get('/cases/:caseId/evolutions', async (request, reply) => {
    const paramsSchema = z.object({ caseId: z.string().uuid() })
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      pageSize: z.coerce.number().default(10) 
    })

    try {
      const { caseId } = paramsSchema.parse(request.params)
      const { page, pageSize } = querySchema.parse(request.query)
      const user = request.user as UserPayload

      // Filtro Base
      const whereCondition: any = {
        casoId: caseId, // Garante que só busca desse caso
      }

      // Filtro de Segurança (Quem vê o quê)
      if (user.cargo !== Cargo.Gerente) {
        whereCondition.OR = [
            { sigilo: false },       // Vejo todas as públicas
            { autorId: user.sub }    // Vejo as minhas (mesmo sigilosas)
        ]
      }

      const [evolucoes, total] = await Promise.all([
        prisma.evolucao.findMany({
          where: whereCondition,
          orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            autor: {
              select: { id: true, nome: true, cargo: true }
            }
          }
        }),
        prisma.evolucao.count({ where: whereCondition })
      ])

      return reply.send({
        items: evolucoes,
        total,
        page,
        totalPages: Math.ceil(total / pageSize)
      })

    } catch (error) {
      console.error("Erro GET Evoluções:", error)
      return reply.status(500).send({ message: 'Erro ao listar evoluções.' })
    }
  })

  // 3. EDITAR
  app.put('/evolutions/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const bodySchema = z.object({ conteudo: z.string().min(3), sigilo: z.boolean() })

    try {
      const { id } = paramsSchema.parse(request.params)
      const { conteudo, sigilo } = bodySchema.parse(request.body)
      const user = request.user as UserPayload

      const evolucao = await prisma.evolucao.findUnique({ where: { id } })
      if (!evolucao) return reply.status(404).send({ message: 'Não encontrado.' })

      if (evolucao.autorId !== user.sub) return reply.status(403).send({ message: 'Sem permissão.' })

      const updated = await prisma.evolucao.update({
        where: { id },
        data: { conteudo, sigilo }
      })

      return reply.send(updated)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao editar.' })
    }
  })

  // 4. EXCLUIR
  app.delete('/evolutions/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    try {
      const { id } = paramsSchema.parse(request.params)
      const user = request.user as UserPayload

      const evolucao = await prisma.evolucao.findUnique({ where: { id } })
      if (!evolucao) return reply.status(404).send({ message: 'Não encontrado.' })

      if (evolucao.autorId !== user.sub && user.cargo !== Cargo.Gerente) {
        return reply.status(403).send({ message: 'Sem permissão.' })
      }

      await prisma.evolucao.delete({ where: { id } })
      
      await prisma.caseLog.create({
        data: {
          casoId: evolucao.casoId,
          autorId: user.sub,
          acao: LogAction.OUTRO,
          descricao: 'Excluiu uma evolução.'
        }
      })

      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao excluir.' })
    }
  })
}