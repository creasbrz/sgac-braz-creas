// backend/src/services/PafService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

interface CreatePafInput {
  casoId: string
  autorId: string
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: Date
}

interface UpdatePafInput {
  casoId: string
  userId: string
  diagnostico?: string
  objetivos?: string
  estrategias?: string
  deadline?: Date
}

export class PafService {

  // Garante UTC meio-dia para evitar shifts de fuso horário
  private static stripTime(date: Date | string): Date {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0))
  }

  static async getByCaseId(casoId: string) {
    return prisma.paf.findUnique({
      where: { casoId },
      include: { autor: { select: { id: true, nome: true } } }
    })
  }

  static async getHistory(casoId: string) {
    const paf = await prisma.paf.findUnique({ where: { casoId } })
    if (!paf) return []

    return prisma.pafVersion.findMany({
      where: { pafId: paf.id },
      orderBy: { savedAt: 'desc' },
      include: { autor: { select: { nome: true } } }
    })
  }

  static async create(data: CreatePafInput) {
    // Verifica se já existe
    const existing = await prisma.paf.findUnique({ where: { casoId: data.casoId } })
    if (existing) throw new Error('ALREADY_EXISTS')

    const created = await prisma.paf.create({
      data: {
        ...data,
        deadline: this.stripTime(data.deadline),
        versaoAtual: 1,
      },
      include: { autor: { select: { id: true, nome: true } } }
    })

    // Log Assíncrono
    await prisma.caseLog.create({
      data: {
        casoId: data.casoId,
        autorId: data.autorId,
        acao: LogAction.PAF_CRIADO,
        descricao: 'Elaborou o Plano de Acompanhamento Familiar (PAF).',
      },
    }).catch(console.error)

    return created
  }

  /**
   * Atualiza o PAF aplicando versionamento automático via Transação
   */
  static async update({ casoId, userId, ...data }: UpdatePafInput) {
    const existing = await prisma.paf.findUnique({ where: { casoId } })
    if (!existing) throw new Error('NOT_FOUND')

    const result = await prisma.$transaction(async (tx) => {
      // 1. Salvar versão antiga (Snapshot)
      await tx.pafVersion.create({
        data: {
          pafId: existing.id,
          diagnostico: existing.diagnostico,
          objetivos: existing.objetivos,
          estrategias: existing.estrategias,
          deadline: existing.deadline,
          autorId: existing.autorId,
          versaoNumero: existing.versaoAtual,
          savedAt: new Date()
        },
      })

      // 2. Atualizar registro atual (Current State)
      const nextVersion = existing.versaoAtual + 1
      
      const updated = await tx.paf.update({
        where: { casoId },
        data: {
          ...data,
          deadline: data.deadline ? this.stripTime(data.deadline) : undefined,
          autorId: userId, // Novo autor da versão
          versaoAtual: nextVersion,
        },
        include: { autor: { select: { id: true, nome: true } } }
      })

      // 3. Log Auditoria
      await tx.caseLog.create({
        data: {
          casoId,
          autorId: userId,
          acao: LogAction.PAF_ATUALIZADO,
          descricao: `Atualizou PAF para versão ${nextVersion}.`,
        },
      })

      return updated
    })

    return result
  }
}