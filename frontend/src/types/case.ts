// frontend/src/types/case.ts
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
  criadoPor: { nome: string }
  agenteAcolhida: { id: string; nome: string } | null
  especialistaPAEFI: { id: string; nome: string } | null
  beneficios: string[]
  motivoDesligamento: string | null
  parecerFinal: string | null
}

export interface Evolution {
  id: string
  conteudo: string
  createdAt: string
  autor: { nome: string }
}

export interface PafData {
  diagnostico: string
  objetivos: string
  estrategias: string
  prazos: string
  createdAt: string
  autor: { nome: string }
}

export interface UserOption {
  id: string
  nome: string
}