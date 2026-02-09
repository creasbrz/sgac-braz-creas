// frontend/src/types/workspace.ts
import { UserRole } from './user' // Certifique-se que este arquivo existe
import { AppointmentCategory } from './agenda' // Certifique-se que este arquivo existe

// ==========================================
// 1. ENUMS E CONSTANTES
// ==========================================

export enum AlertType {
  PAF_NOT_STARTED = 'PAF_NOT_STARTED',       // Caso aceito, mas PAF não criado em X dias
  PAF_STALLED = 'PAF_STALLED',               // PAF criado, mas sem evoluções recentes
  PAF_REVIEW_OVERDUE = 'PAF_REVIEW_OVERDUE', // Data de revisão do PAF vencida
  RECEPTION_DELAY = 'RECEPTION_DELAY',       // Acolhida inicial atrasada (Agente)
  NOT_STARTED_YET = 'NOT_STARTED_YET'        // Caso atribuído, mas status não movido para "Em Atendimento"
}

// ==========================================
// 2. ENTIDADES BASE (COMPARTILHADAS)
// ==========================================

/**
 * Representação leve de um caso para listagens (Dashboard/Workspace).
 * @note Substitui o antigo DashboardCase para manter compatibilidade com SharedComponents.tsx
 */
export interface BaseCase {
  id: string
  nomeCompleto: string
  status: string
  urgencia?: string | null
  
  /** * Pode vir como array do backend ou string CSV em views legadas 
   */
  violacao?: string | string[] | null 
  
  updatedAt: string
  dataEntrada?: string // Usado para calcular SLA de acolhida
  
  // Opcionais úteis para UI
  responsavelId?: string
  tecnicoResponsavel?: {
    nome: string
  }
}

/**
 * Representação leve de um agendamento para widgets.
 */
export interface DashboardAppointment {
  id: string
  data: string // ISO Date string
  titulo: string
  tipo?: AppointmentCategory | string
  caso?: { 
    id: string
    nomeCompleto: string 
  }
}

export interface CaseAlert extends BaseCase {
  alertType: AlertType // Renomeado de 'type' para evitar conflito com palavras reservadas
  daysLate: number     // Renomeado de 'days' para ser mais semântico
}

// ==========================================
// 3. WORKSPACES POR PERFIL (DISCRIMINATED UNIONS)
// ==========================================

/**
 * 🏢 Workspace do Gerente: Visão macro da unidade.
 */
export interface ManagerWorkspaceData {
  role: 'Gerente' // Discriminador
  
  stats: {
    totalActive: number
    waitingForReception: number     // Triagem
    waitingForDistribution: number  // Gargalo (Sem técnico)
    totalPaefi: number              // Adicionado para KPI
  }
  
  /** Carga de trabalho da equipe */
  teamLoad: {
    id: string
    nome: string
    role: UserRole | string
    activeCases: number
    monitoringCases?: number
  }[]
  
  /** Top violações para gráfico de barras */
  topViolations: { 
    label: string
    count: number 
  }[]
  
  recentAppointments: DashboardAppointment[]
}

/**
 * ⚖️ Workspace do Auditor: Qualidade de dados e conformidade.
 */
export interface IncompleteCase extends Pick<BaseCase, 'id' | 'nomeCompleto' | 'status'> {
  missingFields: string[] // Ex: ['CPF', 'Endereço', 'Telefone']
}

export interface AuditLogSummary {
  id: string
  acao: string
  descricao: string
  autor: string
  data: string
}

export interface AuditorWorkspaceData {
  role: 'Auditor' // Discriminador
  
  incompleteCases: IncompleteCase[]
  recentLogs: AuditLogSummary[]
  
  complianceStats: {
    pafCoverage: number // % de casos ativos com PAF
    seiCoverage: number // % de casos com nº SEI
    dataQualityScore: number // 0-100
  }
}

/**
 * 👷 Workspace Operacional: Agente Social e Especialista.
 */
export interface OperationalWorkspaceData {
  role: 'Agente_Social' | 'Especialista' // Discriminador
  
  /** Meus casos ativos ou monitorados */
  myCases: BaseCase[]
  
  /** Alertas de prazo e estagnação */
  alerts: CaseAlert[]
  
  /** Meus próximos compromissos */
  appointments: DashboardAppointment[]
  
  /** Estatísticas específicas do cargo */
  detailedStats: {
    // --- Comum ---
    meusAtivos: number

    // --- Especialista (Técnico) ---
    monitoramento?: number
    acolhidaEsp?: number
    acompanhamento?: number // PAEFI
    
    // --- Agente Social ---
    meusAguardando?: number    // Aguardando visita/contato
    meusEmAtendimento?: number // Triagem em andamento
    filaGeral?: number         // Sem dono (para puxar)
  }
}

// ==========================================
// 4. TIPO DE RETORNO DA API
// ==========================================

export type WorkspaceResponse = 
  | ManagerWorkspaceData 
  | AuditorWorkspaceData 
  | OperationalWorkspaceData