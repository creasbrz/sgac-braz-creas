// frontend/src/types/case.ts
// --- TIPOS AUXILIARES (ENUMS & UNIONS) ---

export type CaseStatus = 
  | 'AGUARDANDO_ACOLHIDA' 
  | 'EM_ACOLHIDA' 
  | 'AGUARDANDO_DISTRIBUICAO' 
  | 'EM_ACOLHIDA_ESPECIALIZADA' 
  | 'EM_ACOMPANHAMENTO' 
  | 'EM_MONITORAMENTO' 
  | 'DESLIGADO';

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
  
  // Dados Sócio-econômicos do Familiar
  ocupacao?: string | null
  renda?: number | string | null
  
  observacoes?: string | null
  // RMA (Bloco C)
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
  
  // [NOVOS CAMPOS] Sócio-econômico do Titular
  ocupacao?: string | null
  renda?: number | null
  
  // [NOVO] Objeto calculado pelo backend
  dadosEconomicos?: EconomicData

  // 2. Contatos e Endereço
  contatos?: Contact[] 
  telefone?: string | null // Legacy fallback
  
  // Endereço Detalhado
  endereco?: string | null // Legacy fallback
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
  
  // Endereço e Contato resumidos para listas
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