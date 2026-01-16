// backend/src/services/FamilyService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'

interface AddFamilyMemberInput {
  caseId: string
  userId: string
  nome: string
  parentesco: string
  idade?: number
  cpf?: string | null
  nascimento?: Date | null
  telefone?: string | null
  ocupacao?: string
  renda?: number
  observacoes?: string
}

export class FamilyService {

  /**
   * Helper privado para serializar Decimal -> Number
   * Isso evita o erro: "Do not know how to serialize a BigInt" ou objetos Decimal complexos
   */
  private static serializeMember(member: any) {
    return {
      ...member,
      renda: member.renda ? Number(member.renda) : null
    }
  }

  static async list(caseId: string) {
    const members = await prisma.membroFamilia.findMany({
      // CORREÇÃO: Mapeia explicitamente o argumento 'caseId' para o campo 'casoId'
      where: { casoId: caseId },
      orderBy: { createdAt: 'asc' }
    })

    return members.map(this.serializeMember)
  }

  static async add({ caseId, userId, cpf, telefone, ...data }: AddFamilyMemberInput) {
    // 1. Limpeza de Dados (Regra de Negócio)
    const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : null
    const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null

    // 2. Persistência
    const member = await prisma.membroFamilia.create({
      data: {
        ...data,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        // CORREÇÃO: Mapeamento explícito
        casoId: caseId 
      }
    })

    // 3. Log
    await prisma.caseLog.create({
      data: {
        // CORREÇÃO: Mapeamento explícito
        casoId: caseId,
        autorId: userId,
        acao: LogAction.MEMBRO_FAMILIA_ADICIONADO,
        descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
      }
    }).catch(console.error)

    return this.serializeMember(member)
  }

  static async remove(id: string, userId: string) {
    const member = await prisma.membroFamilia.findUnique({ where: { id } })
    if (!member) throw new Error('NOT_FOUND')

    await prisma.membroFamilia.delete({ where: { id } })

    await prisma.caseLog.create({
      data: {
        casoId: member.casoId,
        autorId: userId,
        acao: LogAction.OUTRO,
        descricao: `Removeu familiar: ${member.nome}`
      }
    }).catch(console.error)

    return true
  }
}