// frontend/src/types/case.ts
// Tipagens otimizadas, padronizadas e preparadas para expansão futura.

export interface PafVersion {
  id: string
  diagnostico: string
  objetivos: string
  estrategias: string
  deadline: string
  savedAt: string
  autor: { nome: string }
  versaoNumero?: number // preparado para versionamento incremental
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
  createdAt: string
  autor: {
    nome: string
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
  urgencia: string // Adicionado
  dataDesligamento?: string | null
  motivoDesligamento?: string | null // [NOVO]
  
  agenteAcolhida: {
    nome: string
  } | null

  especialistaPAEFI: {
    nome: string
  } | null
}
