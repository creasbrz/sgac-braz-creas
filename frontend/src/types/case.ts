// frontend/src/types/case.ts
// --- SUB-INTERFACES ---

export interface Contact {
  numero: string
  tipo: 'Pessoal' | 'Residencial' | 'Trabalho' | 'Vizinho' | 'Parente' | 'Outro'
  nome?: string
  observacao?: string
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
  // [NOVO] Campo necessário para o RMA (Bloco C)
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

  // Identificação
  nomeCompleto: string
  nomeSocial?: string | null
  cpf: string
  nascimento: string
  sexo: string
  
  // --- VERSÃO 2.0 (Novos Campos) ---
  contatos?: Contact[] 
  telefone?: string | null // Legacy fallback
  
  // Endereço Detalhado
  endereco?: string | null // Legacy fallback
  endereco_logradouro?: string
  endereco_complemento?: string
  endereco_bairro?: string
  endereco_cidade?: string
  endereco_uf?: string
  endereco_cep?: string
  endereco_ra?: string
  latitude?: number
  longitude?: number

  // Responsável (Menores)
  responsavelLegal?: string | null
  parentescoResponsavel?: string | null

  // Dados Técnicos
  dataEntrada: string
  urgencia: string
  // [ATUALIZADO] Array de strings conforme schema.prisma
  violacao: string[] 
  categoria: string
  orgaoDemandante: string
  origem: 'ESPONTANEA' | 'DOCUMENTAL' | 'REFERENCIADA' | 'BUSCA_ATIVA' | string
  status: string

  // Administrativo
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  
  // Relacionamentos (Objetos)
  criadoPor: { nome: string }
  agenteAcolhida: { id: string, nome: string } | null
  especialistaPAEFI: { id: string, nome: string } | null

  // Listas (Includes do Prisma)
  beneficios: string[] 
  logs: CaseLog[]
  familia?: FamilyMember[]
  evolucoes?: Evolution[]
  encaminhamentos?: Referral[]
  entregas?: ServiceDeliverable[]
  anexos?: CaseAttachment[]
  paf?: PafData | null

  // Desligamento
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
  status: string
  dataEntrada: string
  urgencia: string
  // [ATUALIZADO] Array de strings para consistência
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