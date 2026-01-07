import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

interface AuthUser {
  sub: string
  cargo: 'Agente_Social' | 'Especialista' | 'Gerente' | 'Auditor'
}

export async function waitingListRoutes(app: FastifyInstance) {
  
  app.addHook('onRequest', async (req, reply) => {
    try { await req.jwtVerify() } catch { return reply.status(401).send() }
  })

  // [GET] Listar itens da fila baseados no cargo
  app.get('/cases/waiting', async (req, reply) => {
    const { sub: userId, cargo } = req.user as AuthUser

    try {
      let whereCondition: any = {}

      // --- DEFINIÇÃO DE FILTROS POR CARGO ---
      
      if (cargo === 'Agente_Social') {
        // [CORREÇÃO] Agente vê APENAS casos AGUARDANDO_ACOLHIDA atribuídos a ELE.
        // Antes era geral, agora é pessoal.
        whereCondition = { 
          status: 'AGUARDANDO_ACOLHIDA',
          agenteAcolhidaId: userId 
        }
      } 
      else if (cargo === 'Gerente') {
        // Gerente vê a fila de distribuição para PAEFI (Gargalo de gestão)
        whereCondition = { status: 'AGUARDANDO_DISTRIBUICAO_PAEFI' }
      } 
      else if (cargo === 'Especialista') {
        // Especialista vê casos atribuídos a ele que ainda não iniciou o PAEFI
        whereCondition = { 
          status: 'EM_ACOLHIDA_ESPECIALIZADA',
          especialistaPAEFIId: userId 
        }
      }
      else if (cargo === 'Auditor') {
        // Auditor vê todos os gargalos
        whereCondition = { 
          status: { in: ['AGUARDANDO_ACOLHIDA', 'AGUARDANDO_DISTRIBUICAO_PAEFI', 'EM_ACOLHIDA_ESPECIALIZADA'] } 
        }
      }

      // --- CONSULTA ---
      const cases = await prisma.case.findMany({
        where: {
          ...whereCondition,
          deletado: false
        },
        orderBy: [
          { pesoUrgencia: 'desc' }, // 1º Prioridade: Urgência
          { dataEntrada: 'asc' }    // 2º Prioridade: Antiguidade
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

  // [PATCH] Ações da Fila (Iniciar Atendimento)
  app.patch('/cases/waiting/:id/assign', async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
    const { sub: userId, cargo } = req.user as AuthUser
    
    const bodySchema = z.object({ targetUserId: z.string().uuid().optional() })
    const { targetUserId } = bodySchema.parse(req.body || {})

    try {
      const existingCase = await prisma.case.findUnique({ where: { id } })
      if (!existingCase) return reply.status(404).send({ message: 'Caso não encontrado.' })

      let updateData: any = {}
      let logAction = ''

      // 1. Agente inicia acolhida (O caso já é dele, ele só muda o status)
      if (cargo === 'Agente_Social' && existingCase.status === 'AGUARDANDO_ACOLHIDA') {
        // Verificação de segurança: O caso é realmente dele?
        if (existingCase.agenteAcolhidaId !== userId) {
            // Opcional: Se quiser permitir que ele "roube" casos sem dono, remova este if.
            // Mas pela regra de negócio atual, deve ser dele.
            return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }

        updateData = { status: 'EM_ACOLHIDA' }
        logAction = 'Iniciou Acolhida'
      }
      // 2. Gerente distribui para Especialista
      else if (cargo === 'Gerente' && existingCase.status === 'AGUARDANDO_DISTRIBUICAO_PAEFI') {
        if (!targetUserId) return reply.status(400).send({ message: 'Selecione um especialista.' })
        
        updateData = {
          status: 'EM_ACOLHIDA_ESPECIALIZADA',
          especialistaPAEFIId: targetUserId
        }
        logAction = 'Distribuiu Caso PAEFI'
      }
      // 3. Especialista aceita/inicia
      else if (cargo === 'Especialista' && existingCase.status === 'EM_ACOLHIDA_ESPECIALIZADA') {
        if (existingCase.especialistaPAEFIId !== userId) {
           return reply.status(403).send({ message: 'Este caso não foi atribuído a você.' })
        }
        updateData = { status: 'EM_ACOMPANHAMENTO_PAEFI' }
        logAction = 'Iniciou Acompanhamento'
      }
      else {
        return reply.status(400).send({ message: 'Ação não permitida.' })
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: updateData
      })

      await prisma.caseLog.create({
        data: {
          casoId: id,
          autorId: userId,
          acao: 'MUDANCA_STATUS',
          descricao: `${logAction} via Fila de Espera`
        }
      })

      return reply.send(updatedCase)

    } catch (error) {
      console.error(error)
      return reply.status(500).send({ message: 'Erro ao processar ação.' })
    }
  })
}