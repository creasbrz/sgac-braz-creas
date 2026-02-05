// frontend/src/types/workspace.ts
import { UserRole } from './user'
import { AppointmentCategory } from './agenda'

// ==========================================
// 1. ENUMS E AUXILIARES
// ==========================================

export enum AlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',       // Caso aceito, mas PAF não criado em X dias
  PAF_STALLED = 'PAF_STALLED',               // PAF criado, mas sem evoluções recentes
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE', // Data de revisão do PAF vencida
  RECEPTION_DELAY = 'RECEPTION_DELAY',       // Acolhida inicial atrasada (Agente)
  NOT_STARTED_YET = 'NOT_STARTED_YET'        // Caso atribuído, mas status não movido para "Em Atendimento"
}

/**
 * Representação leve de um agendamento para o widget do dashboard.
 */
export interface DashboardAppointment {
  id: string
  data: string // ISO Date string
  titulo: string
  tipo?: AppointmentCategory
  caso?: { 
    id: string
    nomeCompleto: string 
  }
}

/**
 * Resumo de caso otimizado para listas rápidas e alertas.
 */
export interface DashboardCase {
  id: string
  nomeCompleto: string
  status: string
  urgencia?: 'ALTA' | 'MEDIA' | 'BAIXA' | null
  violacao?: string | null
  updatedAt: string
  dataEntrada?: string // Usado para calcular SLA de acolhida
  
  // Opcional: ID do responsável atual para filtragem rápida no front
  responsavelId?: string
}

export interface CaseAlert extends DashboardCase {
  type: AlertType
  days: number // Dias de atraso ou estagnação
}

// ==========================================
// 2. DTOs DE RESPOSTA (WORKSPACES)
// ==========================================

/**
 * Workspace do Gerente: Visão macro da unidade.
 */
export interface ManagerWorkspaceData {
  role: 'Gerente' // String literal para Discriminated Union
  
  stats: {
    totalActive: number
    /** Casos que acabaram de chegar (Triagem/Recepção) */
    waitingForReception: number 
    /** Casos triados aguardando técnico de referência (Gargalo) */
    waitingForDistribution: number 
  }
  
  teamLoad: {
    id: string
    nome: string
    role: UserRole
    activeCases: number
    monitoringCases?: number
  }[]
  
  topViolations: { 
    label: string
    count: number 
  }[]
  
  recentAppointments: DashboardAppointment[]
}

/**
 * Tipos auxiliares para o Auditor
 */
export interface IncompleteCase {
  id: string
  nome: string
  status: string
  missingFields: string[] // Ex: ['CPF', 'Endereço', 'Telefone']
}

export interface AuditLogSummary {
  id: string
  acao: string
  descricao: string
  autor: string
  data: string
}

/**
 * Workspace do Auditor: Foco em qualidade de dados e conformidade.
 */
export interface AuditorWorkspaceData {
  role: 'Auditor'
  incompleteCases: IncompleteCase[]
  recentLogs: AuditLogSummary[]
  complianceStats: {
    pafCoverage: number // % de casos ativos com PAF
    seiCoverage: number // % de casos com nº SEI
  }
}

/**
 * Workspace Operacional: Foco nas tarefas do dia a dia.
 * (Compartilhado entre Agente Social e Especialista)
 */
export interface OperationalWorkspaceData {
  role: 'Agente_Social' | 'Especialista'
  
  /** Meus casos ativos ou monitorados */
  myCases: DashboardCase[]
  
  /** Alertas de prazo e estagnação */
  alerts: CaseAlert[]
  
  /** Meus próximos compromissos */
  appointments: DashboardAppointment[]
  
  /** Estatísticas específicas do cargo */
  detailedStats: {
    // --- Especialista (Técnico) ---
    /** Casos em monitoramento (menos prioridade) */
    monitoramento?: number
    /** Acolhidas especializadas pendentes */
    acolhidaEsp?: number
    /** Casos em acompanhamento sistemático (PAEFI) */
    acompanhamento?: number
    
    // --- Agente Social ---
    /** Atribuídos a mim, aguardando 1º contato */
    meusAguardando?: number    
    /** Atribuídos a mim, triagem em andamento */
    meusEmAtendimento?: number 
    /** Fila geral da unidade (sem dono, para puxar) */
    filaGeral?: number         
  }
}

// ==========================================
// 3. UNION TYPE PRINCIPAL
// ==========================================

export type WorkspaceResponse = 
  | ManagerWorkspaceData 
  | AuditorWorkspaceData 
  | OperationalWorkspaceData