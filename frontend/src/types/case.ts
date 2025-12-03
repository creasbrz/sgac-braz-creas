// frontend/src/types/case.ts

export interface FamilyMember {
  id: string
  nome: string
  parentesco: string
  idade?: number | null
  // [NOVOS CAMPOS]
  cpf?: string | null
  nascimento?: string | null
  telefone?: string | null
  
  ocupacao?: string | null
  renda?: number | null
  observacoes?: string | null
  createdAt: string
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
  autor: {
    id: string
    nome: string
  }
}

export interface CaseLog {
  id: string
  acao: string
  descricao: string
  createdAt: string
  valorAnterior?: string | null
  valorNovo?: string | null
  autor: {
    nome: string
  }
}

export interface Referral {
  id: string
  tipo: string
  instituicao: string
  motivo: string
  status: 'PENDENTE' | 'CONCLUIDO' | 'NEGADO'
  dataEnvio: string
  retorno?: string | null
  createdAt: string
  autor: {
    nome: string
  }
}

export interface CaseDetailData {
  id: string
  nomeCompleto: string
  cpf: string
  nascimento: string
  sexo: string
  telefone: string
  endereco: string
  dataEntrada: string
  urgencia: string
  violacao: string
  categoria: string
  orgaoDemandante: string
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  status: string

  criadoPor: {
    nome: string
  }

  agenteAcolhida: {
    id: string
    nome: string
  } | null

  especialistaPAEFI: {
    id: string
    nome: string
  } | null

  beneficios: string[]
  logs: CaseLog[]

  motivoDesligamento: string | null
  parecerFinal: string | null
  dataInicioPAEFI?: string
  dataDesligamento?: string
}

export interface Evolution {
  id: string
  conteudo: string
  sigilo: boolean
  createdAt: string
  autor: {
    id: string
    nome: string
    cargo?: string
  }
}

export interface UserOption {
  id: string
  nome: string
}

export interface CaseSummary {
  id: string
  nomeCompleto: string
  cpf: string
  status: string
  dataEntrada: string
  urgencia: string
  violacao?: string
  sexo?: string
  dataDesligamento?: string | null
  motivoDesligamento?: string | null
  
  agenteAcolhida: {
    nome: string
  } | null

  especialistaPAEFI: {
    nome: string
  } | null
}