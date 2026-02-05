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
 * Interface Base para Casos nas listagens do Workspace.
 * Unifica DashboardCase e BaseCase para evitar duplicidade.
 */
export interface BaseCase {
  id: string
  nomeCompleto: string
  status: string
  // Tipado como string para evitar conflitos com literais estritos no frontend
  // A validação visual é feita pelos helpers (getUrgencyColor)
  urgencia: string 
  violacao: string[] | string | null // Flexibilidade para array ou string vindo do backend
  updatedAt: string
  dataEntrada: string
  
  // Campos opcionais úteis para filtros
  responsavelId?: string
}

// Alias para compatibilidade se necessário, ou usar BaseCase diretamente
export type DashboardCase = BaseCase

export interface CaseAlert extends BaseCase {
  type: AlertType
  days: number // Dias de atraso ou estagnação
}

/**
 * Estrutura de carga de trabalho da equipe.
 * [CORREÇÃO] Propriedade 'cases' padronizada com o Backend V2.0.
 */
export interface TeamLoadMember {
  id: string
  nome: string
  role: UserRole
  cases: number // Corrigido de 'activeCases' para 'cases'
  monitoringCases?: number
}

// ==========================================
// 2. DTOs DE RESPOSTA (WORKSPACES)
// ==========================================

/**
 * Workspace do Gerente: Visão macro da unidade.
 */
export interface ManagerWorkspaceData {
  role: 'Gerente'
  
  stats: {
    totalActive: number
    /** Casos que acabaram de chegar (Triagem/Recepção) */
    waitingForReception: number 
    /** Casos triados aguardando técnico de referência (Gargalo) */
    waitingForDistribution: number 
  }
  
  // Lista tipada corretamente
  teamLoad: TeamLoadMember[]
  
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
  myCases: BaseCase[]
  
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