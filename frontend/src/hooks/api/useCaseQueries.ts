// frontend/src/hooks/api/useCaseQueries.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// --- Tipos de Dados ---

// Tipo para os detalhes completos de um caso
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
}

// Tipo para uma única evolução no histórico
export interface Evolution {
  id: string
  conteudo: string
  createdAt: string
  autor: { nome: string }
}

// Tipo para os dados de um PAF
export interface PafData {
  diagnostico: string
  objetivos: string
  estrategias: string
  prazos: string
  createdAt: string
  autor: { nome: string }
}

// Tipo para as opções de utilizador (Agentes, Especialistas)
export interface UserOption {
  id: string
  nome: string
}

// --- Hooks de Consulta (Queries) ---

/**
 * Hook para buscar os detalhes de um caso específico.
 * @param caseId O ID do caso a ser buscado.
 */
export function useCaseDetail(caseId?: string) {
  return useQuery<CaseDetailData>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}`)
      return response.data
    },
    enabled: !!caseId, // A query só é executada se o ID for válido
  })
}

/**
 * Hook para buscar o histórico de evoluções de um caso.
 * @param caseId O ID do caso.
 */
export function useEvolutions(caseId?: string) {
  return useQuery<Evolution[]>({
    queryKey: ['evolutions', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/evolutions`)
      return response.data
    },
    enabled: !!caseId,
  })
}

/**
 * Hook para buscar o PAF (Plano de Acompanhamento Familiar) de um caso.
 * @param caseId O ID do caso.
 */
export function usePaf(caseId?: string) {
  return useQuery<PafData | null>({
    queryKey: ['paf', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/paf`)
      return response.data
    },
    enabled: !!caseId,
  })
}

/**
 * Hook para buscar a lista de utilizadores com o cargo de 'Especialista'.
 */
export function useSpecialists() {
  return useQuery<UserOption[]>({
    queryKey: ['specialists'],
    queryFn: async () => {
      const response = await api.get('/users/specialists')
      return response.data
    },
  })
}

