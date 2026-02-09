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
   * Lista evoluções aplicando regras estritas de visualização (Sigilo por Perfil)
   * Regra v8.3: 
   * - Gerente vê tudo.
   * - Agentes veem sigilosos de Agentes.
   * - Especialistas veem sigilosos de Especialistas.
   */
  static async list({ caseId, userId, cargo, page, pageSize }: ListEvolutionInput) {
    // 1. Definição da cláusula WHERE base
    const whereCondition: any = { 
      casoId: caseId 
    }

    // 2. Lógica de Sigilo (Security Gate)
    if (cargo !== Cargo.Gerente) {
      // Se não for gerente, aplica filtros
      const roleFilter = cargo === Cargo.Agente_Social ? Cargo.Agente_Social : Cargo.Especialista

      whereCondition.OR = [
        // A. Pode ver todas as públicas
        { sigilo: false },
        
        // B. Pode ver as suas próprias (sempre)
        { autorId: userId },

        // C. Pode ver sigilosas SE forem do mesmo cargo (Perfil)
        { 
          AND: [
            { sigilo: true },
            { autor: { cargo: roleFilter } } 
          ]
        }
      ]
    }
    // Se for Gerente, não adiciona filtros, vê tudo.

    // 3. Query Otimizada
    const [items, total] = await Promise.all([
      prisma.evolucao.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          autor: { 
            select: { 
              id: true, 
              nome: true, 
              cargo: true 
            } 
          }
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