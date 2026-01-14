import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus, LogAction } from '@prisma/client'

// --- Schemas ---

const waitingCaseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  dataEntrada: z.date(),
  urgencia: z.string(),
  pesoUrgencia: z.number(),
  // [CORREÇÃO] Ajustado para array de strings, conforme o banco de dados
  violacao: z.array(z.string()), 
  status: z.string(),
  agenteAcolhida: z.object({ nome: z.string() }).nullable().optional(),
  especialistaPAEFI: z.object({ nome: z.string() }).nullable().optional()
})

const assignBodySchema = z.object({
  targetUserId: z.string().uuid().optional()
})

export async function waitingListRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()
  
  server.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send({ message: 'Não autorizado' }) }
  })

  // 1. [GET] Listar Itens da Fila (Dashboard de Fluxo)
  server.get('/cases/waiting', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Listar casos parados aguardando ação do usuário logado',
      response: {
        200: z.array(waitingCaseSchema)
      }
    }
  }, async (req, reply) => {
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }

    try {
      let whereCondition: any = { deletado: false }

      // --- Lógica de Negócio: Quem vê o quê na fila? ---
      
      if (cargo === Cargo.Agente_Social) {
        whereCondition.status = CaseStatus.AGUARDANDO_ACOLHIDA
        whereCondition.agenteAcolhidaId = userId 
      } 
      else if (cargo === Cargo.Gerente) {
        whereCondition.status = CaseStatus.AGUARDANDO_DISTRIBUICAO
      } 
      else if (cargo === Cargo.Especialista) {
        whereCondition.status = CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
        whereCondition.especialistaPAEFIId = userId 
      }
      else if (cargo === Cargo.Auditor) {
        whereCondition.status = { 
          in: [
            CaseStatus.AGUARDANDO_ACOLHIDA, 
            CaseStatus.AGUARDANDO_DISTRIBUICAO, 
            CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
          ] 
        }
      } else {
        return reply.send([])
      }

      const cases = await prisma.case.findMany({
        where: whereCondition,
        orderBy: [
          { pesoUrgencia: 'desc' },
          { dataEntrada: 'asc' }
        ],
        select: {
          id: true,
          nomeCompleto: true,
          dataEntrada: true,
          urgencia: true,
          pesoUrgencia: true,
          violacao: true,
          status: true,
          agenteAcolhida: { select: { nome: true } },
          especialistaPAEFI: { select: { nome: true } }
        }
      })

      return reply.send(cases)

    } catch (error) {
      console.error('[WAITING_LIST_ERROR]', error)
      return reply.status(500).send({ message: 'Erro ao buscar fila de espera.' })
    }
  })

  // 2. [PATCH] Ações da Fila
  server.patch('/cases/waiting/:id/assign', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Realizar ação da fila (Iniciar Acolhida, Distribuir ou Iniciar Acompanhamento)',
      params: z.object({ id: z.string().uuid() }),
      body: assignBodySchema,
      response: {
        200: z.object({ status: z.string() })
      }
    }
  }, async (req, reply) => {
    const { id } = req.params
    const { targetUserId } = req.body
    const { sub: userId, cargo } = req.user as { sub: string, cargo: Cargo }

    try {
      const existingCase = await prisma.case.findUnique({ where: { id } })
      if (!existingCase) return reply.status(404).send({ message: 'Caso não encontrado.' })

      let updateData: any = {}
      let logDescricao = ''
      let logAction: LogAction = LogAction.MUDANCA_STATUS

      // Cenário 1: Agente inicia acolhida
      if (cargo === Cargo.Agente_Social && existingCase.status === CaseStatus.AGUARDANDO_ACOLHIDA) {
        if (existingCase.agenteAcolhidaId !== userId) {
            return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }
        updateData = { status: CaseStatus.EM_ACOLHIDA }
        logDescricao = 'Iniciou a Acolhida (Check-in)'
      }
      
      // Cenário 2: Gerente distribui para Especialista
      else if (cargo === Cargo.Gerente && existingCase.status === CaseStatus.AGUARDANDO_DISTRIBUICAO) {
        if (!targetUserId) return reply.status(400).send({ message: 'Selecione um especialista para assumir o caso.' })
        
        updateData = {
          status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
          especialistaPAEFIId: targetUserId
        }
        
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { nome: true } })
        
        logAction = LogAction.ATRIBUICAO
        logDescricao = `Distribuiu caso para: ${targetUser?.nome || 'Especialista'}`
      }
      
      // Cenário 3: Especialista inicia acompanhamento
      else if (cargo === Cargo.Especialista && existingCase.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA) {
        if (existingCase.especialistaPAEFIId !== userId) {
           return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }
        updateData = { 
          status: CaseStatus.EM_ACOMPANHAMENTO,
          dataInicioPAEFI: new Date()
        }
        logDescricao = 'Iniciou Acompanhamento PAEFI (Aceite)'
      }
      
      else {
        return reply.status(400).send({ message: 'Ação não permitida para o status atual ou seu cargo.' })
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.case.update({
          where: { id },
          data: updateData,
          select: { status: true }
        })

        await tx.caseLog.create({
          data: {
            casoId: id,
            autorId: userId,
            acao: logAction,
            descricao: logDescricao,
            valorAnterior: existingCase.status,
            valorNovo: updated.status
          }
        })

        return updated
      })

      return reply.send(result)

    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao processar ação na fila.' })
    }
  })
}