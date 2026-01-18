// backend/src/services/FamilyService.ts
import { prisma } from '../lib/prisma'
import { LogAction, MembroFamilia } from '@prisma/client'

// DTO para entrada de dados
interface AddFamilyMemberInput {
  caseId: string
  userId: string
  nome: string
  parentesco: string
  idade?: number
  cpf?: string | null
  nascimento?: Date | string | null
  telefone?: string | null
  ocupacao?: string
  renda?: number
  observacoes?: string
}

export class FamilyService {

  /**
   * Remove caracteres não numéricos de uma string (ex: CPF, Telefone)
   */
  private static cleanDigits(value?: string | null): string | null {
    if (!value) return null
    return value.replace(/\D/g, '')
  }

  /**
   * Converte objetos do Prisma (especialmente Decimal) para JSON-safe
   */
  private static serializeMember(member: MembroFamilia) {
    return {
      ...member,
      // Converte Decimal para Number (JavaScript primitivo) para evitar erros de serialização
      renda: member.renda ? Number(member.renda) : null
    }
  }

  /**
   * Lista todos os membros de uma família vinculada a um caso
   */
  static async list(caseId: string) {
    const members = await prisma.membroFamilia.findMany({
      where: { casoId: caseId }, // Mapeamento correto com o schema
      orderBy: { createdAt: 'asc' }
    })

    return members.map(this.serializeMember)
  }

  /**
   * Adiciona um novo membro à família e registra o log
   */
  static async add({ caseId, userId, cpf, telefone, nascimento, ...data }: AddFamilyMemberInput) {
    // 1. Sanitização de Dados
    const cpfLimpo = this.cleanDigits(cpf)
    const telefoneLimpo = this.cleanDigits(telefone)
    
    // Garante que nascimento seja Date ou null
    const dataNascimento = nascimento ? new Date(nascimento) : null

    // 2. Persistência
    const member = await prisma.membroFamilia.create({
      data: {
        ...data,
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        nascimento: dataNascimento,
        casoId: caseId // Vincula ao caso corretamente
      }
    })

    // 3. Log de Auditoria (Executado em segundo plano para não bloquear)
    prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.MEMBRO_FAMILIA_ADICIONADO,
        descricao: `Adicionou familiar: ${data.nome} (${data.parentesco})`
      }
    }).catch(err => console.error("Erro ao criar log de família:", err))

    return this.serializeMember(member)
  }

  /**
   * Remove um membro da família
   */
  static async remove(id: string, userId: string) {
    // Verifica existência antes de deletar para pegar dados para o log
    const member = await prisma.membroFamilia.findUnique({ 
      where: { id },
      select: { id: true, nome: true, casoId: true }
    })

    if (!member) {
      throw new Error('Membro familiar não encontrado.')
    }

    // Deleção
    await prisma.membroFamilia.delete({ where: { id } })

    // Log de Auditoria
    prisma.caseLog.create({
      data: {
        casoId: member.casoId,
        autorId: userId,
        acao: LogAction.OUTRO, // Idealmente criar LogAction.MEMBRO_FAMILIA_REMOVIDO no schema
        descricao: `Removeu familiar: ${member.nome}`
      }
    }).catch(err => console.error("Erro ao criar log de remoção:", err))

    return true
  }
}