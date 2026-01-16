// backend/src/services/EvolutionService.ts
import { prisma } from '../lib/prisma'
import { LogAction, Cargo } from '@prisma/client'

interface CreateEvolutionInput {
  caseId: string
  userId: string
  conteudo: string
  sigilo: boolean
}

interface ListEvolutionInput {
  caseId: string
  userId: string
  cargo: string
  page: number
  pageSize: number
}

export class EvolutionService {
  
  /**
   * Lista evoluções aplicando regras estritas de visualização (Sigilo)
   */
  static async list({ caseId, userId, cargo, page, pageSize }: ListEvolutionInput) {
    // 1. Busca dados de atribuição do caso
    const caso = await prisma.case.findUnique({
      where: { id: caseId },
      select: { agenteAcolhidaId: true, especialistaPAEFIId: true }
    })

    if (!caso) throw new Error('CASE_NOT_FOUND')

    // 2. Regras de Permissão
    const isGerente = cargo === Cargo.Gerente
    const isResponsavel = caso.agenteAcolhidaId === userId || caso.especialistaPAEFIId === userId
    
    // Quem pode ver tudo (incluindo sigilosos)? Gerentes e Técnicos Responsáveis
    const canViewSigilo = isGerente || isResponsavel

    const whereCondition: any = { casoId: caseId }

    if (!canViewSigilo) {
      // Regra: Se não for responsável, vê apenas PÚBLICAS ou AS SUAS PRÓPRIAS
      whereCondition.OR = [
        { sigilo: false },
        { autorId: userId }
      ]
    }

    // 3. Query
    const [items, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { select: { id: true, nome: true, cargo: true } }
        }
      }),
      prisma.evolucao.count({ where: whereCondition })
    ])

    return { items, total }
  }

  /**
   * Cria evolução e log
   */
  static async create({ caseId, userId, conteudo, sigilo }: CreateEvolutionInput) {
    const evolucao = await prisma.evolucao.create({
      data: {
        conteudo,
        sigilo,
        casoId: caseId,
        autorId: userId
      },
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })

    // Log Assíncrono
    await prisma.caseLog.create({
      data: {
        casoId: caseId,
        autorId: userId,
        acao: LogAction.EVOLUCAO_CRIADA,
        descricao: sigilo 
          ? 'Registrou uma evolução técnica (SIGILOSA).' 
          : 'Registrou uma evolução técnica pública.'
      }
    }).catch(console.error)

    return evolucao
  }

  /**
   * Atualiza evolução (apenas autor)
   */
  static async update(id: string, userId: string, data: { conteudo?: string, sigilo?: boolean }) {
    const existing = await prisma.evolucao.findUnique({ where: { id } })
    
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.autorId !== userId) throw new Error('FORBIDDEN')

    return prisma.evolucao.update({
      where: { id },
      data,
      include: { autor: { select: { id: true, nome: true, cargo: true } } }
    })
  }

  /**
   * Remove evolução (apenas autor)
   */
  static async delete(id: string, userId: string) {
    const existing = await prisma.evolucao.findUnique({ where: { id } })
    
    if (!existing) throw new Error('NOT_FOUND')
    if (existing.autorId !== userId) throw new Error('FORBIDDEN')

    await prisma.evolucao.delete({ where: { id } })
    return true
  }
}