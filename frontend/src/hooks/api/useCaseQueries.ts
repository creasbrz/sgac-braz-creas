// frontend/src/hooks/api/useCaseQueries.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CaseDetailData, Evolution, PafData, UserOption } from '@/types/case'

export function useCaseDetail(caseId?: string) {
  return useQuery<CaseDetailData>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}`)
      return response.data
    },
    enabled: !!caseId,
  })
}

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

export function useAgents() {
  return useQuery<UserOption[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/users/agents')
      return response.data
    },
  })
}

export function useSpecialists() {
  return useQuery<UserOption[]>({
    queryKey: ['specialists'],
    queryFn: async () => {
      const response = await api.get('/users/specialists')
      return response.data
    },
  })
}