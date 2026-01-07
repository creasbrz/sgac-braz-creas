export type UserRole = 'GERENTE' | 'AUDITOR' | 'AGENTE_SOCIAL' | 'ESPECIALISTA'

export enum AlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',
  PAF_STALLED = 'PAF_STALLED',
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE',
  RECEPTION_DELAY = 'RECEPTION_DELAY',
  NOT_STARTED_YET = 'NOT_STARTED_YET' // [NOVO]
}

export interface Appointment {
  id: string
  data: string
  titulo: string
  caso?: { nomeCompleto: string }
}

export interface BaseCase {
  id: string
  nomeCompleto: string
  status: string
  urgencia?: 'ALTA' | 'MEDIA' | 'BAIXA' | null
  violacao?: string | null
  updatedAt: string
  dataEntrada?: string // Importante para calcular atraso na acolhida
}

export interface CaseAlert extends BaseCase {
  type: AlertType
  days: number
}

// --- DTOs ---

export interface ManagerWorkspaceData {
  role: 'GERENTE'
  stats: {
    totalActive: number
    waitingForReception: number     // Aguardando Acolhida (Porta de entrada)
    waitingForDistribution: number  // Aguardando Distribuição PAEFI (Gargalo interno)
  }
  teamLoad: {
    nome: string
    role: string
    cases: number
  }[]
  topViolations: { label: string; count: number }[]
  appointments: Appointment[]
}

export interface AuditorWorkspaceData {
  role: 'AUDITOR'
  incompleteCases: any[]
  recentLogs: any[]
}

export interface OperationalWorkspaceData {
  role: 'AGENTE_SOCIAL' | 'ESPECIALISTA'
  myCases: BaseCase[]
  alerts: CaseAlert[]
  appointments: Appointment[]
  detailedStats: {
    // Especialista
    monitoramento?: number
    acolhidaEsp?: number
    acompanhamento?: number
    // Agente
    meusAguardando?: number    // Atribuídos a mim, não iniciados
    meusEmAtendimento?: number // Atribuídos a mim, em andamento
    filaGeral?: number         // Sem dono (para puxar)
  }
}

export type WorkspaceResponse = 
  | ManagerWorkspaceData 
  | AuditorWorkspaceData 
  | OperationalWorkspaceData