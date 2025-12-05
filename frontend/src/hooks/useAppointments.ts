// frontend/src/hooks/useAppointments.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Appointment {
  id: string
  titulo: string
  data: string
  observacoes?: string | null
  caso: {
    id: string
    nomeCompleto: string
    telefone?: string | null // [ATUALIZADO]
  }
  responsavel?: {
    nome: string
  }
}

export function useMonthAppointments(month: string) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', month],
    queryFn: async () => {
      const response = await api.get('/appointments', { params: { month } })
      return response.data
    },
    staleTime: 1000 * 60,
  })
}