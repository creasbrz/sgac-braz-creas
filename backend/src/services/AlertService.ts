// backend/src/services/AlertService.ts
import { prisma } from '../lib/prisma'
import { differenceInDays, isValid } from 'date-fns'
import { Cargo, CaseStatus } from '@prisma/client'

// Tipagem do Retorno
export interface AlertItem {
  id: string
  nomeCompleto: string
  type: 'PAF_NOT_STARTED' | 'PAF_STALLED' | 'PAF_REVIEW_OVERDUE' | 'NOT_STARTED_YET' | 'RECEPTION_DELAY'
  days: number
  urgencia: string
}

export class AlertService {
  /**
   * Calcula os alertas (sinais de trânsito) baseados no cargo do usuário logado.
   */
  static async getAlertsForUser(userId: string, cargo: string): Promise<AlertItem[]> {
    // 1. Definição de Escopo (Security Rules)
    let whereCondition: any = { status: { not: CaseStatus.DESLIGADO } }

    if (cargo === Cargo.Especialista) {
      whereCondition.especialistaPAEFIId = userId
    } else if (cargo === Cargo.Agente_Social) {
      whereCondition.agenteAcolhidaId = userId
      whereCondition.status = { in: [CaseStatus.EM_ACOLHIDA, CaseStatus.AGUARDANDO_ACOLHIDA] }
    } else if (cargo === Cargo.Gerente || cargo === Cargo.Auditor) {
      // Gerente vê alertas de TODOS os casos que possuem responsável técnico
      whereCondition.OR = [
        { especialistaPAEFIId: { not: null } },
        { agenteAcolhidaId: { not: null } }
      ]
    } else {
      // Cargos administrativos/estagiários não veem alertas técnicos
      return []
    }

    // 2. Busca Otimizada (Select magro)
    const cases = await prisma.case.findMany({
      where: whereCondition,
      select: {
        id: true,
        nomeCompleto: true,
        status: true,
        dataEntrada: true,
        urgencia: true,
        // Traz apenas a data da última evolução
        evolucoes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      },
      take: 200 // Limite de segurança para performance na UI
    })

    const today = new Date()

    // 3. Processamento das Regras (Memory Computing)
    const alerts: (AlertItem | null)[] = cases.map(c => {
      try {
        const lastEvolucao = c.evolucoes[0]?.createdAt
        const lastDate = lastEvolucao ? new Date(lastEvolucao) : null
        const dataEntrada = c.dataEntrada ? new Date(c.dataEntrada) : new Date()

        // --- Regras para Especialista (PAEFI) ---
        if (cargo === Cargo.Especialista || (cargo === Cargo.Gerente && c.status.includes('PAEFI'))) {
          // A. Caso sem evolução nenhuma (PAF não iniciado)
          if (!lastDate) {
            return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_NOT_STARTED', days: 0, urgencia: c.urgencia }
          }
          
          if (isValid(lastDate)) {
            const daysSince = differenceInDays(today, lastDate)
            
            // B. Revisão do PAF Vencida (> 90 dias)
            if (daysSince >= 90) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_REVIEW_OVERDUE', days: daysSince, urgencia: c.urgencia }
            }
            // C. Caso Estagnado (> 30 dias sem registro técnico)
            if (daysSince >= 30) {
              return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'PAF_STALLED', days: daysSince, urgencia: c.urgencia }
            }
          }
        }

        // --- Regras para Agente Social (Acolhida) ---
        if (cargo === Cargo.Agente_Social || (cargo === Cargo.Gerente && c.status.includes('ACOLHIDA'))) {
           const daysWaiting = differenceInDays(today, dataEntrada)
           
           // A. Atribuído mas não iniciado (> 2 dias)
           if (c.status === CaseStatus.AGUARDANDO_ACOLHIDA && daysWaiting > 2) {
             return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'NOT_STARTED_YET', days: daysWaiting, urgencia: c.urgencia }
           }
           // B. Acolhida Travada (> 5 dias sem finalizar/evoluir)
           if (c.status === CaseStatus.EM_ACOLHIDA && !lastDate && daysWaiting > 5) {
             return { id: c.id, nomeCompleto: c.nomeCompleto, type: 'RECEPTION_DELAY', days: daysWaiting, urgencia: c.urgencia }
           }
        }
      } catch (err) {
        return null
      }
      return null
    })

    // Filtra nulos e retorna array limpo
    return alerts.filter((a): a is AlertItem => a !== null)
  }
}