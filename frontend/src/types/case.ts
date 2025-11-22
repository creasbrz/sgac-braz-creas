// frontend/src/types/case.ts
export interface CaseDetailData { //
  id: string
  nomeCompleto: string //
  cpf: string //
  nascimento: string //
  sexo: string //
  telefone: string //
  endereco: string //
  dataEntrada: string //
  urgencia: string //
  violacao: string //
  categoria: string //
  orgaoDemandante: string //
  numeroSei: string | null
  linkSei: string | null
  observacoes: string | null
  status: string //
  criadoPor: { nome: string } //
  agenteAcolhida: { id: string; nome: string } | null
  especialistaPAEFI: { id: string; nome: string } | null
  beneficios: string[] //
  motivoDesligamento: string | null
  parecerFinal: string | null
  // Adiciona campos que podem vir do backend
  dataInicioPAEFI?: string
  dataDesligamento?: string
}

export interface Evolution { //
  id: string
  conteudo: string // O frontend usa 'conteudo'
  createdAt: string //
  autor: { nome: string } //
}

// --- ALTERAÇÃO APLICADA AQUI ---
export interface PafData { //
  id: string // Adicionado ID do PAF
  diagnostico: string //
  objetivos: string //
  estrategias: string //
  
  // Trocado 'prazos: string' por 'deadline: string' (data ISO)
  deadline: string //

  createdAt: string //
  autor: { //
    id: string
    nome: string
  }
}
// --- FIM DA ALTERAÇÃO ---

export interface UserOption { //
  id: string
  nome: string
}

// Resumo do caso para as tabelas
export interface CaseSummary {
  id: string
  nomeCompleto: string
  cpf: string
  status: string
  dataEntrada: string
  dataDesligamento?: string | null
  agenteAcolhida: { nome: string } | null
  especialistaPAEFI: { nome: string } | null
}