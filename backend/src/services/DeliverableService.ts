// backend/src/services/DeliverableService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

interface CreateDeliverableInput {
  caseId: string
  userId: string
  tipo: string
  observacoes?: string
}

interface UpdateDeliverableInput {
  id: string
  userId: string
  status: string // 'SOLICITADO' | 'CONCEDIDO' | 'ENTREGUE' | 'NEGADO'
  dataEntrega?: Date
}

export class DeliverableService {
  
  /**
   * Lista benefícios de um caso
   */
  static async list(caseId: string) {
    return prisma.serviceDeliverable.findMany({
      where: { casoId: caseId }, // Mapeamento correto (DB: casoId, Arg: caseId)
      orderBy: { createdAt: 'desc' },
      include: { 
        responsavel: { select: { nome: true } } 
      }
    })
  }

  /**
   * Cria um benefício e registra o log atomicamente (Transaction)
   */
  static async create({ caseId, userId, tipo, observacoes }: CreateDeliverableInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Cria o registro do benefício
      const item = await tx.serviceDeliverable.create({
        data: {
          tipo,
          status: 'SOLICITADO',
          observacoes,
          casoId: caseId,
          responsavelId: userId
        }
      })

      // 2. Cria o log de auditoria na mesma transação
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: LogAction.ENTREGA_BENEFICIO_CRIADA,
          descricao: `Solicitou benefício: ${tipo}`
        }
      })
      
      return item
    })
  }

  /**
   * Atualiza status e registra log atomicamente
   */
  static async updateStatus({ id, userId, status, dataEntrega }: UpdateDeliverableInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Atualiza
      const item = await tx.serviceDeliverable.update({
        where: { id },
        data: {
          status,
          dataEntrega: dataEntrega || undefined
        },
        include: { responsavel: { select: { nome: true } } }
      })

      // 2. Log
      await tx.caseLog.create({
        data: {
          casoId: item.casoId,
          autorId: userId,
          acao: LogAction.ENTREGA_BENEFICIO_ATUALIZADA,
          descricao: `Atualizou benefício ${item.tipo} para ${status}`
        }
      })

      return item
    })
  }
}