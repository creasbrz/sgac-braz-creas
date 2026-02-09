// frontend/src/types/case.ts
import { CaseStatusType } from '@/constants/cases/definitions'

// ==========================================
// 1. TIPOS PRIMITIVOS E ENUMS
// ==========================================

export type CaseStatus = CaseStatusType;

/**
 * Origem da demanda conforme tipologia do SUAS.
 * @see Prisma Enum 'CaseOrigin'
 */
export type CaseOrigin = 
  | 'ESPONTANEA' 
  | 'DOCUMENTAL' 
  | 'REFERENCIADA' 
  | 'BUSCA_ATIVA';

export type ContactType = 
  | 'Pessoal' 
  | 'Residencial' 
  | 'Trabalho' 
  | 'Vizinho' 
  | 'Parente' 
  | 'Outro';

export type ServiceDeliverableStatus = 
  | 'SOLICITADO' 
  | 'CONCEDIDO' 
  | 'NEGADO' 
  | 'ENTREGUE' 
  | 'PENDENTE' 
  | 'CANCELADO';

export type ReferralStatus = 
  | 'PENDENTE' 
  | 'CONCLUIDO' 
  | 'NEGADO' 
  | 'CANCELADO';

// --- Utilitários Genéricos ---

export interface UserOption {
  id: string
  nome: string
}

export interface StatData {
  name: string
  value: number
}

// ==========================================
// 2. OBJETOS DE VALOR E SUB-ENTIDADES
// ==========================================

export interface Contact {
  numero: string
  tipo: ContactType
  nome?: string
  observacao?: string
}

export interface EconomicData {
  rendaTotal: number
  numeroPessoas: number
  rendaPerCapita: number
}

/**
 * Representa um Benefício Eventual ou Transferência de Renda.
 */
export interface ServiceDeliverable {
  id: string
  tipo: string
  status: ServiceDeliverableStatus
  dataSolicitacao: string // ISO Date
  dataEntrega?: string | null
  observacoes?: string | null
  responsavel?: { nome: string }
}

export interface FamilyMember {
  id: string
  nome: string
  parentesco: string
  idade?: number | null
  cpf?: string | null
  nascimento?: string | null
  telefone?: string | null
  ocupacao?: string | null
  renda?: number | string | null
  observacoes?: string | null
  violacao?: string[]
  createdAt: string
}

export interface CaseAttachment {
  id: string
  nome: string
  tipo: string // MIME type ou extensão
  url: string
  tamanho?: number // em bytes
  createdAt: string
  autor: { nome: string }
}

export interface Referral {
  id: string
  tipo: string // Ex: Saúde, Educação
  instituicao: string
  motivo: string
  status: ReferralStatus
  dataEnvio: string
  retorno?: string | null
  createdAt: string
  autor: { nome: string }
}

export interface CaseLog {
  id: string
  acao: string
  descricao: string
  createdAt: string
  valorAnterior?: string | null
  valorNovo?: string | null
  autor: { nome: string }
}

export interface Evolution {
  id: string
  conteudo: string
  sigilo: boolean
  createdAt: string
  autor: { id: string; nome: string; cargo?: string }
}

// ==========================================
// 3. PAF (PLANO DE ACOMPANHAMENTO FAMILIAR)
// ==========================================

export interface PafVersion {
  id: string
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: string // Data prevista para reavaliação
  savedAt: string
  autor: { nome: string }
  versaoNumero?: number
}

export interface PafData {
  id: string
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: string
  createdAt: string
  updatedAt?: string
  versaoAtual?: number
  autor: { id: string; nome: string }
}

// ==========================================
// 4. ENTIDADES PRINCIPAIS (AGGREGATES)
// ==========================================

export interface LinkedCase {
  id: string
  nomeCompleto: string
  status: string
}

/**
 * Objeto completo do Prontuário para visualização detalhada.
 */
export interface CaseDetailData {
  id: string
  createdAt: string
  updatedAt: string

  // --- Identificação ---
  nomeCompleto: string
  nomeSocial?: string | null
  cpf: string
  nascimento: string // ISO Date
  sexo: string
  email?: string | null // [NOVO v8.2]
  
  // --- Sócio-econômico ---
  ocupacao?: string | null
  renda?: number | null
  dadosEconomicos?: EconomicData

  // --- Contatos e Localização ---
  contatos?: Contact[] 
  telefone?: string | null 
  endereco?: any 
  endereco_logradouro?: string | null
  endereco_complemento?: string | null
  endereco_bairro?: string | null
  endereco_cidade?: string | null
  endereco_uf?: string | null
  endereco_cep?: string | null
  endereco_ra?: string | null
  latitude?: number | null
  longitude?: number | null

  // --- Responsável (para menores de idade) ---
  responsavelLegal?: string | null
  parentescoResponsavel?: string | null

  // --- Dados Técnicos da Demanda ---
  dataEntrada: string
  urgencia: 'BAIXA' | 'MEDIA' | 'ALTA' | string
  violacao: string[] 
  categoria: string // Ex: PAEFI, PAIF
  orgaoDemandante: string 
  origem: CaseOrigin
  status: CaseStatus

  // --- Administrativo / SEI ---
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  seiRespondido: boolean
  dataRespostaSei: string | null
  
  // --- Equipe Técnica ---
  criadoPor: { nome: string }
  agenteAcolhida: { id: string, nome: string } | null
  especialistaPAEFI: { id: string, nome: string } | null

  // --- Relacionamentos ---
  beneficios: string[] 
  logs: CaseLog[]
  familia?: FamilyMember[]
  evolucoes?: Evolution[]
  encaminhamentos?: Referral[]
  entregas?: ServiceDeliverable[]
  anexos?: CaseAttachment[]
  paf?: PafData | null

  // [NOVO v8.2] Vínculos entre Prontuários
  casoPrincipal?: LinkedCase | null
  casosVinculados?: LinkedCase[]

  // --- Dados de Desligamento ---
  motivoDesligamento: string | null
  destinoDesligamento: string | null
  parecerFinal: string | null
  dataInicioPAEFI?: string | null
  dataDesligamento?: string | null
  
  // [NOVO v8.2] Flag de Referência
  manterReferencia?: boolean
}

/**
 * Objeto resumido para listagens e tabelas.
 */
export interface CaseSummary {
  id: string
  nomeCompleto: string
  cpf: string
  status: CaseStatus
  dataEntrada: string
  urgencia: string
  violacao?: string[] 
  sexo?: string
  endereco?: string | null
  endereco_ra?: string | null
  contatos?: Contact[]
  telefone?: string | null
  dataDesligamento?: string | null
  motivoDesligamento?: string | null
  destinoDesligamento?: string | null
  agenteAcolhida: { nome: string } | null
  especialistaPAEFI: { nome: string } | null
}

// ==========================================
// 5. RELATÓRIOS E INTEGRAÇÃO BI
// ==========================================

export interface UrgencyStatData extends StatData {
  weight: number // Peso para cálculo de prioridade
}

export interface MapPointData {
  id: string
  lat: number
  lng: number
  intensity: number // 0 a 1 para heatmap
  label: string
  violacao?: string[]
  categoria?: string
  endereco?: string | null
}

export interface ObservatoryData {
  evolutionData: { name: string; novos: number; desligados: number }[]
  violationData: StatData[]
  urgencyData: UrgencyStatData[]
  
  // Fluxos de Rede
  originData: StatData[]
  networkData: StatData[]
  entryTypeData: StatData[]

  benefitsData: StatData[]
  
  collectiveData: { 
    totalGroups: number;
    totalParticipants: number;
    avgAttendance: number;
  }
  
  efficiencyData: { 
    avgPermanence: number; 
    avgWaitTime: number; 
    retentionRate?: number;
    totalClosed: number 
  }
  
  // Demografia
  ageData: StatData[]
  sexData: StatData[]
  
  // Território
  mapData: MapPointData[]
}

export interface ManagementReportData {
  periodo: string
  stats: { ativos: number; acolhidas: number; paefi: number; novos: number; desligados: number }
  cargaHoraria: { agentes: StatData[]; especialistas: StatData[] }
  vigilancia?: { violacoes: StatData[]; demografia: StatData[]; territorio?: StatData[] }
}

export interface InsightData {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface AnalyticsReportData {
  periodo: number;
  kpis: {
    tempoMedio: number;
    ativosPaefi: number;
    previsaoNovos: number | null;
  };
  insights: InsightData[];
  fluxo: {
    name: string;
    novos: number;
    fechados: number;
  }[];
  violacoes: {
    name: string;
    value: number;
    percent: number;
  }[];
  produtividade: {
    name: string;
    value: number;
  }[];
}

// ==========================================
// 6. RMA (REGISTRO MENSAL DE ATENDIMENTOS)
// ==========================================

export interface AgeBreakdown {
  masculino: { a0_12: number; a13_17: number; a18_59: number; a60_mais: number };
  feminino: { a0_12: number; a13_17: number; a18_59: number; a60_mais: number };
  total: number;
}

export interface ChildBreakdown {
  masculino: { a0_6: number; a7_12: number; a13_17: number };
  feminino: { a0_6: number; a7_12: number; a13_17: number };
  total: number;
}

export interface ChildLaborBreakdown {
  masculino: { a0_12: number; a13_15: number };
  feminino: { a0_12: number; a13_15: number };
  total: number;
}

export interface RmaReportData {
  periodo?: string;
  bloco1: {
    // A - Volume de Atendimentos
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    
    // B - Perfil das Famílias
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: AgeBreakdown;
    b7_mse: number;

    // C - Crianças e Adolescentes em Serviço
    c1_infamiliar: ChildBreakdown;
    c2_abuso: ChildBreakdown;
    c3_exploracao: ChildBreakdown;
    c4_negligencia: ChildBreakdown;
    c5_trabalho_infantil: ChildLaborBreakdown;

    // D - Idosos
    d1_violencia: number;
    d2_negligencia: number;

    // E - PCD (Pessoas com Deficiência)
    e1_violencia: AgeBreakdown;
    e2_negligencia: AgeBreakdown;

    // F - Mulheres
    f1_mulheres: number;

    // G - Tráfico de Pessoas
    g1_trafico: AgeBreakdown;

    // H - Discriminação
    h1_discriminacao: number;

    // I - População em Situação de Rua
    i1_rua: AgeBreakdown;
  };
  bloco2: {
    m1_individual: number;
    m2_grupo: number;
    m3_cras: number;
    m4_visitas: number;
  };
}

export interface ReportChartData {
  name: string;
  value: number;
}

export interface DismissalReportData {
  periodo: string;
  total: number;
  successRate: number;
  evasionRate: number;
  byReason: ReportChartData[];
  monthlyTrend: ReportChartData[];
}