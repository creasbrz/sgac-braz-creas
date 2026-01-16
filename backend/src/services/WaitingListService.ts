// backend/src/services/WaitingListService.ts
import { prisma } from '../lib/prisma'
import { Cargo, CaseStatus, LogAction } from '@prisma/client'

interface ProcessActionInput {
  caseId: string
  userId: string
  cargo: Cargo
  targetUserId?: string
}

export class WaitingListService {

  /**
   * Retorna os casos da fila baseados na permissão do cargo
   */
  static async getWaitingList(userId: string, cargo: Cargo) {
    let whereCondition: any = { deletado: false }

    // Regras de Visibilidade (Quem vê o quê)
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
      return [] // Outros cargos não têm fila de espera
    }

    return prisma.case.findMany({
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
  }

  /**
   * Processa a transição de estado do caso (Workflow)
   */
  static async processAction({ caseId, userId, cargo, targetUserId }: ProcessActionInput) {
    const existingCase = await prisma.case.findUnique({ where: { id: caseId } })
    if (!existingCase) throw new Error('NOT_FOUND')

    let updateData: any = {}
    let logDescricao = ''
    let logAction: LogAction = LogAction.MUDANCA_STATUS

    // --- LÓGICA DE TRANSIÇÃO DE ESTADOS ---

    // 1. Agente: Iniciar Acolhida (Check-in)
    if (cargo === Cargo.Agente_Social && existingCase.status === CaseStatus.AGUARDANDO_ACOLHIDA) {
      if (existingCase.agenteAcolhidaId !== userId) throw new Error('FORBIDDEN_OWNERSHIP')
      
      updateData = { status: CaseStatus.EM_ACOLHIDA }
      logDescricao = 'Iniciou a Acolhida (Check-in)'
    }
    
    // 2. Gerente: Distribuir para Especialista
    else if (cargo === Cargo.Gerente && existingCase.status === CaseStatus.AGUARDANDO_DISTRIBUICAO) {
      if (!targetUserId) throw new Error('MISSING_TARGET_USER')
      
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { nome: true } })
      
      updateData = {
        status: CaseStatus.EM_ACOLHIDA_ESPECIALIZADA,
        especialistaPAEFIId: targetUserId
      }
      
      logAction = LogAction.ATRIBUICAO
      logDescricao = `Distribuiu caso para: ${targetUser?.nome || 'Especialista'}`
    }
    
    // 3. Especialista: Aceitar Caso (Iniciar PAEFI)
    else if (cargo === Cargo.Especialista && existingCase.status === CaseStatus.EM_ACOLHIDA_ESPECIALIZADA) {
      if (existingCase.especialistaPAEFIId !== userId) throw new Error('FORBIDDEN_OWNERSHIP')
      
      updateData = { 
        status: CaseStatus.EM_ACOMPANHAMENTO,
        dataInicioPAEFI: new Date()
      }
      logDescricao = 'Iniciou Acompanhamento PAEFI (Aceite)'
    }
    
    else {
      throw new Error('INVALID_TRANSITION')
    }

    // --- EXECUÇÃO TRANSACIONAL ---
    return prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id: caseId },
        data: updateData,
        select: { status: true }
      })

      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: logAction,
          descricao: logDescricao,
          valorAnterior: existingCase.status,
          valorNovo: updated.status
        }
      })

      return updated
    })
  }
}