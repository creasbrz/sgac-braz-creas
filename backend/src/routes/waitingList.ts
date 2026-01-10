// backend/src/routes/waitingList.ts
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
  violacao: z.string(),
  status: z.string(),
  agenteAcolhida: z.object({ nome: z.string() }).nullable().optional(),
  especialistaPAEFI: z.object({ nome: z.string() }).nullable().optional()
})

const assignBodySchema = z.object({
  targetUserId: z.string().uuid().optional() // Obrigatório apenas para Gerente distribuindo
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
        // Agente vê: Casos na sua caixa de entrada pessoal
        whereCondition.status = CaseStatus.AGUARDANDO_ACOLHIDA
        whereCondition.agenteAcolhidaId = userId 
      } 
      else if (cargo === Cargo.Gerente) {
        // Gerente vê: Gargalo de distribuição (casos que saíram da acolhida e esperam técnico)
        whereCondition.status = CaseStatus.AGUARDANDO_DISTRIBUICAO
      } 
      else if (cargo === Cargo.Especialista) {
        // Especialista vê: Casos atribuídos a ele que ainda não deu o "aceite"
        whereCondition.status = CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
        whereCondition.especialistaPAEFIId = userId 
      }
      else if (cargo === Cargo.Auditor) {
        // Auditor vê: Todos os gargalos do sistema
        whereCondition.status = { 
          in: [
            CaseStatus.AGUARDANDO_ACOLHIDA, 
            CaseStatus.AGUARDANDO_DISTRIBUICAO, 
            CaseStatus.EM_ACOLHIDA_ESPECIALIZADA
          ] 
        }
      } else {
        return reply.send([]) // Outros cargos não têm fila
      }

      const cases = await prisma.case.findMany({
        where: whereCondition,
        orderBy: [
          { pesoUrgencia: 'desc' }, // 1º Prioridade: Urgência
          { dataEntrada: 'asc' }    // 2º Prioridade: Antiguidade (FIFO)
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

  // 2. [PATCH] Ações da Fila (Transição de Estado + Log)
  server.patch('/cases/waiting/:id/assign', {
    schema: {
      tags: ['Fila de Espera'],
      summary: 'Realizar ação da fila (Iniciar Acolhida, Distribuir ou Iniciar Acompanhamento)',
      params: z.object({ id: z.string().uuid() }),
      body: assignBodySchema,
      response: {
        200: z.object({ status: z.string() }) // Retorna apenas o novo status
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

      // --- Máquina de Estados ---

      // Cenário 1: Agente inicia acolhida
      if (cargo === Cargo.Agente_Social && existingCase.status === CaseStatus.AGUARDANDO_ACOLHIDA) {
        if (existingCase.agenteAcolhidaId !== userId) {
            return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }
        updateData = { status: CaseStatus.EM_ACOLHIDA }
        logDescricao = 'Iniciou a Acolhida (Check-in)'
      }
      
      // Cenário 2: Gerente distribui para Especialista (Fluxo PAEFI)
      else if (cargo === Cargo.Gerente && existingCase.status === CaseStatus.AGUARDANDO_DISTRIBUICAO) {
        if (!targetUserId) return reply.status(400).send({ message: 'Selecione um especialista para assumir o caso.' })
        
        updateData = {
          status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, // Próximo passo: Especialista aceitar
          especialistaPAEFIId: targetUserId
        }
        
        // Busca nome do especialista para o log ficar bonito
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { nome: true } })
        
        logAction = LogAction.ATRIBUICAO
        logDescricao = `Distribuiu caso para: ${targetUser?.nome || 'Especialista'}`
      }
      
      // Cenário 3: Especialista inicia acompanhamento (Aceite)
      else if (cargo === Cargo.Especialista && existingCase.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA) {
        if (existingCase.especialistaPAEFIId !== userId) {
           return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }
        updateData = { 
          status: CaseStatus.EM_ACOMPANHAMENTO,
          dataInicioPAEFI: new Date() // Marca o início oficial do acompanhamento
        }
        logDescricao = 'Iniciou Acompanhamento PAEFI (Aceite)'
      }
      
      else {
        return reply.status(400).send({ message: 'Ação não permitida para o status atual ou seu cargo.' })
      }

      // TRANSACTION: Atualiza Caso + Cria Log (Atômico)
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.case.update({
          where: { id },
          data: updateData,
          select: { status: true } // Retorno leve
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