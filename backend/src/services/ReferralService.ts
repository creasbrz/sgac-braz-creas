// backend/src/services/ReferralService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

interface CreateReferralInput {
  caseId: string
  userId: string
  instituicao: string
  tipo: string
  motivo: string
}

interface UpdateReferralInput {
  id: string
  status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'
  retorno?: string
}

export class ReferralService {

  static async listByCase(caseId: string) {
    return prisma.encaminhamento.findMany({
      where: { casoId: caseId },
      orderBy: { dataEnvio: 'desc' },
      include: {
        autor: { select: { nome: true } }
      }
    })
  }

  /**
   * Cria Encaminhamento + Evolução + Log (Transaction)
   */
  static async create({ caseId, userId, instituicao, tipo, motivo }: CreateReferralInput) {
    // Valida existência do caso
    const caso = await prisma.case.findUnique({ where: { id: caseId } })
    if (!caso) throw new Error('CASE_NOT_FOUND')

    return prisma.$transaction(async (tx) => {
      // 1. Cria Encaminhamento
      const referral = await tx.encaminhamento.create({
        data: {
          instituicao,
          tipo,
          motivo,
          status: 'PENDENTE',
          casoId: caseId,
          autorId: userId,
          dataEnvio: new Date()
        },
        include: { autor: { select: { nome: true } } }
      })

      // 2. Gera Evolução Automática
      await tx.evolucao.create({
        data: {
          casoId: caseId,
          autorId: userId,
          sigilo: false,
          conteudo: `[SISTEMA - ENCAMINHAMENTO] Realizado para: ${instituicao} (${tipo}).\nMotivo: ${motivo}.`
        }
      })

      // 3. Log de Auditoria
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: LogAction.OUTRO,
          descricao: `Encaminhou para: ${instituicao} (${tipo})`
        }
      })

      return referral
    })
  }

  static async update({ id, status, retorno }: UpdateReferralInput) {
    const existing = await prisma.encaminhamento.findUnique({ where: { id } })
    if (!existing) throw new Error('NOT_FOUND')

    return prisma.encaminhamento.update({
      where: { id },
      data: {
        status,
        retorno,
        updatedAt: new Date()
      },
      include: { autor: { select: { nome: true } } }
    })
  }

  static async delete(id: string, userId: string) {
    const existing = await prisma.encaminhamento.findUnique({ where: { id } })
    
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.autorId !== userId) throw new Error('FORBIDDEN')

    await prisma.encaminhamento.delete({ where: { id } })
    return true
  }
}