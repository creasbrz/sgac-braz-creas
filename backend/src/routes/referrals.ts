// backend/src/routes/referrals.ts
import { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

interface UserPayload {
  sub: string
  nome: string
  cargo: Cargo
}

export async function referralRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify() } 
    catch (err) { return reply.status(401).send({ message: 'Não autorizado.' }) }
  })

  // 1. LISTAR ENCAMINHAMENTOS
  app.get('/cases/:caseId/referrals', async (request, reply) => {
    const params = z.object({ caseId: z.string().uuid() })
    
    try {
      const { caseId } = params.parse(request.params)

      const referrals = await prisma.encaminhamento.findMany({
        where: { casoId: caseId }, // Correção: Mapeamento explícito
        orderBy: { dataEnvio: 'desc' },
        include: {
          autor: { select: { nome: true } }
        }
      })
      return reply.send(referrals)
    } catch (error) {
      console.error("Erro GET Referrals:", error)
      return reply.status(500).send({ message: 'Erro ao listar encaminhamentos.' })
    }
  })

  // 2. CRIAR NOVO ENCAMINHAMENTO
  app.post('/cases/:caseId/referrals', async (request, reply) => {
    const params = z.object({ caseId: z.string().uuid() })
    const body = z.object({
      tipo: z.string().min(1, "Selecione o tipo"), 
      instituicao: z.string().min(3, "Informe o nome da instituição"),
      motivo: z.string().min(3, "Descreva o motivo"),
    })

    try {
      const { caseId } = params.parse(request.params)
      const { tipo, instituicao, motivo } = body.parse(request.body)
      const { sub: userId } = request.user as UserPayload

      const caso = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caso) return reply.status(404).send({ message: 'Caso não encontrado.' })

      const referral = await prisma.encaminhamento.create({
        data: {
          casoId: caseId, // Correção: Mapeamento explícito
          autorId: userId,
          tipo,
          instituicao,
          motivo,
          status: 'PENDENTE',
          dataEnvio: new Date()
        }
      })

      await prisma.caseLog.create({
        data: {
          casoId: caseId, // Correção aqui também
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Encaminhou para ${instituicao} (${tipo})`
        }
      })

      return reply.status(201).send(referral)
    } catch (error) {
      console.error("Erro POST Referral:", error)
      if (error instanceof z.ZodError) return reply.status(400).send({ message: 'Dados inválidos', errors: error.flatten().fieldErrors })
      return reply.status(500).send({ message: 'Erro ao criar encaminhamento.' })
    }
  })

  // 3. ATUALIZAR
  app.patch('/referrals/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() })
    const body = z.object({
      status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']),
      retorno: z.string().optional() 
    })

    try {
      const { id } = params.parse(request.params)
      const { status, retorno } = body.parse(request.body)
      const { sub: userId } = request.user as UserPayload

      const existing = await prisma.encaminhamento.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ message: 'Encaminhamento não encontrado.' })

      const updated = await prisma.encaminhamento.update({
        where: { id },
        data: { status, retorno, updatedAt: new Date() }
      })

      if (retorno && retorno !== existing.retorno) {
        await prisma.caseLog.create({
          data: {
            casoId: existing.casoId,
            autorId: userId,
            acao: LogAction.OUTRO,
            descricao: `Registrou contrarreferência de ${existing.instituicao}`
          }
        })
      }

      return reply.send(updated)
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao atualizar encaminhamento.' })
    }
  })

  // 4. EXCLUIR
  app.delete('/referrals/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() })
    try {
      const { id } = params.parse(request.params)
      const { sub: userId, cargo } = request.user as UserPayload

      const ref = await prisma.encaminhamento.findUnique({ where: { id } })
      if (!ref) return reply.status(404).send({ message: 'Registro não encontrado.' })

      if (cargo !== Cargo.Gerente && ref.autorId !== userId) {
        return reply.status(403).send({ message: 'Sem permissão para excluir.' })
      }

      await prisma.encaminhamento.delete({ where: { id } })
      
      await prisma.caseLog.create({
        data: {
            casoId: ref.casoId,
            autorId: userId,
            acao: LogAction.OUTRO,
            descricao: `Removeu encaminhamento para ${ref.instituicao}`
        }
      })

      return reply.status(204).send()
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao excluir.' })
    }
  })
}