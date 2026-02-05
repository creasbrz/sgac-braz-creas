// frontend/src/hooks/api/useCaseQueries.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CaseDetailData, Evolution, PafData, UserOption } from '@/types/case'

// --- QUERY KEYS FACTORY ---
// Exporte isso para usar em: queryClient.invalidateQueries({ queryKey: CASE_KEYS.detail(id) })
export const CASE_KEYS = {
  all: ['cases'] as const,
  detail: (id?: string) => ['case', id] as const,
  evolutions: (id?: string) => ['evolutions', id] as const,
  paf: (id?: string) => ['paf', id] as const,
  agents: ['agents'] as const,
  specialists: ['specialists'] as const,
}

// --- HOOKS ---

export function useCaseDetail(caseId?: string) {
  return useQuery({
    queryKey: CASE_KEYS.detail(caseId),
    queryFn: async () => {
      // Tipagem direta no get para melhor inferência
      const { data } = await api.get<CaseDetailData>(`/cases/${caseId}`)
      return data
    },
    enabled: !!caseId,
    // Mantém os dados "frescos" por 5 minutos para evitar loading ao navegar entre abas
    staleTime: 1000 * 60 * 5, 
  })
}

export function useEvolutions(caseId?: string) {
  return useQuery({
    queryKey: CASE_KEYS.evolutions(caseId),
    queryFn: async () => {
      const { data } = await api.get<Evolution[]>(`/cases/${caseId}/evolutions`)
      return data
    },
    enabled: !!caseId,
  })
}

export function usePaf(caseId?: string) {
  return useQuery({
    queryKey: CASE_KEYS.paf(caseId),
    queryFn: async () => {
      const { data } = await api.get<PafData | null>(`/cases/${caseId}/paf`)
      return data
    },
    enabled: !!caseId,
  })
}

export function useAgents() {
  return useQuery({
    queryKey: CASE_KEYS.agents,
    queryFn: async () => {
      const { data } = await api.get<UserOption[]>('/users/agents')
      return data
    },
    // Listas de usuários mudam pouco, cache longo (30 min)
    staleTime: 1000 * 60 * 30, 
  })
}

export function useSpecialists() {
  return useQuery({
    queryKey: CASE_KEYS.specialists,
    queryFn: async () => {
      const { data } = await api.get<UserOption[]>('/users/specialists')
      return data
    },
    staleTime: 1000 * 60 * 30,
  })
}