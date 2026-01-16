// backend/src/services/GroupService.ts
import { prisma } from '../lib/prisma'
import { LogAction, GroupType, CaseStatus } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CreateGroupInput {
  tema: string
  tipo: GroupType
  datas?: string[]
  dataRealizacao?: string
  local?: string
  descricao?: string
  orgaosEnvolvidos?: string[]
  facilitadorId: string
}

export class GroupService {

  static async list() {
    return prisma.groupActivity.findMany({
      orderBy: { dataRealizacao: 'desc' },
      take: 100,
      include: {
        facilitador: { select: { nome: true } },
        _count: { select: { participantes: true } }
      }
    })
  }

  static async getById(id: string) {
    return prisma.groupActivity.findUnique({
      where: { id },
      include: {
        facilitador: { select: { id: true, nome: true } },
        participantes: {
          include: {
            caso: { select: { id: true, nomeCompleto: true } }
          },
          orderBy: { caso: { nomeCompleto: 'asc' } }
        }
      }
    })
  }

  /**
   * Busca casos elegíveis para entrar no grupo (exclui quem já está e desligados)
   */
  static async getCandidates(groupId: string) {
    // 1. Valida se grupo existe
    const groupExists = await prisma.groupActivity.findUnique({ where: { id: groupId } })
    if (!groupExists) throw new Error('NOT_FOUND')

    // 2. Busca IDs já vinculados
    const existingMembers = await prisma.groupAttendance.findMany({
      where: { grupoId: groupId },
      select: { casoId: true }
    })
    const excludedIds = existingMembers.map(m => m.casoId)

    // 3. Busca candidatos ativos
    return prisma.case.findMany({
      where: {
        id: { notIn: excludedIds },
        status: { notIn: [CaseStatus.DESLIGADO] }
      },
      select: {
        id: true,
        nomeCompleto: true,
        status: true
      },
      orderBy: { nomeCompleto: 'asc' },
      take: 300
    })
  }

  static async create(data: CreateGroupInput) {
    // Normaliza datas
    let datesToCreate: string[] = []
    if (data.datas && data.datas.length > 0) datesToCreate = data.datas
    else if (data.dataRealizacao) datesToCreate = [data.dataRealizacao]
    else throw new Error('MISSING_DATE')

    // Criação em lote (transação)
    const createdGroups = await prisma.$transaction(
      datesToCreate.map((dateStr) => 
        prisma.groupActivity.create({
          data: {
            tema: data.tema,
            tipo: data.tipo,
            dataRealizacao: new Date(dateStr),
            local: data.local,
            descricao: data.descricao,
            orgaosEnvolvidos: data.orgaosEnvolvidos || [],
            facilitadorId: data.facilitadorId
          }
        })
      )
    )

    return createdGroups
  }

  /**
   * Adiciona participantes em lote com geração automática de Evoluções
   */
  static async addParticipants(groupId: string, caseIds: string[], userId: string) {
    const group = await prisma.groupActivity.findUnique({ where: { id: groupId } })
    if (!group) throw new Error('NOT_FOUND')

    const dataFormatada = format(group.dataRealizacao, "dd/MM/yyyy", { locale: ptBR })

    // Filtra quem já está no grupo (evita erro de Unique Constraint)
    const alreadyInGroup = await prisma.groupAttendance.findMany({
      where: { grupoId: groupId, casoId: { in: caseIds } },
      select: { casoId: true }
    })
    const existingIds = new Set(alreadyInGroup.map(item => item.casoId))
    const newParticipantsIds = caseIds.filter(caseId => !existingIds.has(caseId))

    if (newParticipantsIds.length === 0) return 0

    await prisma.$transaction(async (tx) => {
      // 1. Cria participações
      await Promise.all(newParticipantsIds.map(caseId => 
        tx.groupAttendance.create({
          data: { grupoId: groupId, casoId: caseId, presente: false }
        })
      ))

      // 2. Cria evoluções
      await Promise.all(newParticipantsIds.map(caseId => 
        tx.evolucao.create({
          data: {
            casoId: caseId,
            autorId: userId,
            sigilo: false,
            conteudo: `[SISTEMA - GRUPO] Vinculado à atividade "${group.tema}" (${group.tipo}), prevista para ${dataFormatada}.`
          }
        })
      ))
    })

    return newParticipantsIds.length
  }

  /**
   * Registra presença individual
   */
  static async updateAttendance(groupId: string, caseId: string, presente: boolean, observacoes: string | undefined, userId: string) {
    return prisma.$transaction(async (tx) => {
      const attendance = await tx.groupAttendance.findFirst({ 
        where: { grupoId: groupId, casoId: caseId }
      })
      if (!attendance) throw new Error("ATTENDANCE_NOT_FOUND")

      // Atualiza Status
      const updated = await tx.groupAttendance.update({
        where: { id: attendance.id },
        data: { presente, observacoes }
      })

      // Gera Evolução e Log
      const group = await tx.groupActivity.findUnique({ where: { id: groupId } })
      if (group) {
          const statusTexto = presente ? "PRESENTE" : "AUSENTE"
          const dataFmt = format(group.dataRealizacao, "dd/MM", { locale: ptBR })
          
          await tx.evolucao.create({
            data: {
              casoId: caseId,
              autorId: userId,
              sigilo: false,
              conteudo: `[SISTEMA - FREQUÊNCIA] ${group.tema} (${dataFmt}): ${statusTexto}.${observacoes ? ` Obs: ${observacoes}` : ''}`
            }
          })
      }
      
      await tx.caseLog.create({
        data: {
          casoId: caseId,
          autorId: userId,
          acao: LogAction.PRESENCA_REGISTRADA,
          descricao: `Grupo: ${presente ? 'Presente' : 'Ausente'}`
        }
      })

      return updated
    })
  }

  static async confirmAttendance(id: string) {
    return prisma.groupActivity.update({
      where: { id },
      data: { attendanceConfirmed: true }
    })
  }
}