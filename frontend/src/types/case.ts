import { CaseStatusType } from '@/constants/cases/definitions'

// --- TIPOS AUXILIARES ---

// [REFATORADO] Agora usamos o tipo que vem do arquivo de definições (SSoT)
export type CaseStatus = CaseStatusType;

export type CaseOrigin = 
  | 'ESPONTANEA' 
  | 'DOCUMENTAL' 
  | 'REFERENCIADA' 
  | 'BUSCA_ATIVA';

export type ContactType = 'Pessoal' | 'Residencial' | 'Trabalho' | 'Vizinho' | 'Parente' | 'Outro';

// --- SUB-INTERFACES ---

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

export interface ServiceDeliverable {
  id: string
  tipo: string
  status: 'SOLICITADO' | 'CONCEDIDO' | 'NEGADO' | 'ENTREGUE' | 'PENDENTE' | 'CANCELADO'
  dataSolicitacao: string
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
  tipo: string
  url: string
  tamanho?: number
  createdAt: string
  autor: { nome: string }
}

export interface Referral {
  id: string
  tipo: string
  instituicao: string
  motivo: string
  status: 'PENDENTE' | 'CONCLUIDO' | 'NEGADO' | 'CANCELADO'
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

export interface PafVersion {
  id: string
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: string
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

export interface UserOption {
  id: string
  nome: string
}

// --- INTERFACES PRINCIPAIS ---

export interface CaseDetailData {
  id: string
  createdAt: string
  updatedAt: string

  // 1. Identificação
  nomeCompleto: string
  nomeSocial?: string | null
  cpf: string
  nascimento: string
  sexo: string
  
  // Sócio-econômico do Titular
  ocupacao?: string | null
  renda?: number | null
  dadosEconomicos?: EconomicData

  // 2. Contatos e Endereço
  contatos?: Contact[] 
  telefone?: string | null 
  
  // Endereço Detalhado
  endereco?: string | null 
  endereco_logradouro?: string | null
  endereco_complemento?: string | null
  endereco_bairro?: string | null
  endereco_cidade?: string | null
  endereco_uf?: string | null
  endereco_cep?: string | null
  endereco_ra?: string | null
  latitude?: number | null
  longitude?: number | null

  // 3. Responsável (Menores)
  responsavelLegal?: string | null
  parentescoResponsavel?: string | null

  // 4. Dados Técnicos
  dataEntrada: string
  urgencia: string
  violacao: string[] 
  categoria: string
  orgaoDemandante: string
  origem: CaseOrigin
  status: CaseStatus

  // 5. Administrativo
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  
  // 6. Relacionamentos (Objetos)
  criadoPor: { nome: string }
  agenteAcolhida: { id: string, nome: string } | null
  especialistaPAEFI: { id: string, nome: string } | null

  // 7. Listas (Includes do Prisma)
  beneficios: string[] 
  logs: CaseLog[]
  familia?: FamilyMember[]
  evolucoes?: Evolution[]
  encaminhamentos?: Referral[]
  entregas?: ServiceDeliverable[]
  anexos?: CaseAttachment[]
  paf?: PafData | null

  // 8. Desligamento
  motivoDesligamento: string | null
  destinoDesligamento: string | null
  parecerFinal: string | null
  dataInicioPAEFI?: string
  dataDesligamento?: string
}

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

// --- INTERFACES DE RELATÓRIOS (PDF & DASHBOARDS) ---

export interface StatData {
  name: string
  value: number
}

// Interface específica para Urgência que inclui o peso
export interface UrgencyStatData extends StatData {
  weight: number
}

// --- ESTRUTURAS DO RMA OFICIAL ---

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
  periodo?: string; // Campo auxiliar para exibição no PDF
  bloco1: {
    // A - Volume
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    
    // B - Perfil
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: AgeBreakdown; // Tabela B.6 (Demografia Geral)
    b7_mse: number;

    // C - Crianças
    c1_infamiliar: ChildBreakdown;
    c2_abuso: ChildBreakdown;
    c3_exploracao: ChildBreakdown;
    c4_negligencia: ChildBreakdown;
    c5_trabalho_infantil: ChildLaborBreakdown;

    // D - Idosos
    d1_violencia: number;
    d2_negligencia: number;

    // E - PCD
    e1_violencia: AgeBreakdown;
    e2_negligencia: AgeBreakdown;

    // F - Mulheres
    f1_mulheres: number;

    // G - Tráfico
    g1_trafico: AgeBreakdown;

    // H - Discriminação
    h1_discriminacao: number;

    // I - Pop Rua
    i1_rua: AgeBreakdown;
  };
  bloco2: {
    m1_individual: number;
    m2_grupo: number;
    m3_cras: number;
    m4_visitas: number;
  };
}

// --- OUTROS RELATÓRIOS ---

export interface ManagementReportData {
  periodo: string
  stats: { ativos: number; acolhidas: number; paefi: number; novos: number; desligados: number }
  cargaHoraria: { agentes: StatData[]; especialistas: StatData[] }
  vigilancia?: { violacoes: StatData[]; demografia: StatData[]; territorio?: StatData[] }
}

export interface ObservatoryData {
  evolutionData: { name: string; novos: number; desligados: number }[]
  violationData: StatData[]
  urgencyData: UrgencyStatData[] 
  originData: StatData[]
  networkData: StatData[]
  benefitsData: StatData[]
  collectiveData: { 
    totalGroups: number;
    totalParticipants: number;
    avgAttendance: number;
  }
  efficiencyData: { 
    avgPermanence: number; 
    avgWaitTime: number; 
    retentionRate: number; 
    totalClosed: number 
  }
  ageData: StatData[]
  sexData: StatData[]
}

export interface DismissalReportData {
  periodo: string
  total: number
  successRate: number
  evasionRate: number
  byReason: StatData[]
  monthlyTrend: StatData[]
}

export interface InsightData {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface AnalyticsReportData {
  periodo: number; // Quantidade de meses (ex: 3, 6, 12)
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