// src/types/agenda.ts

// Adicione isso ao final do arquivo:
export interface UpcomingAppointment {
  id: string
  titulo: string
  data: string
  caso?: {
    id: string
    nomeCompleto: string
  } | null
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  color?: string
  tipo: 'INDIVIDUAL' | 'COLETIVO'
  isGroup: boolean
  responsavel?: { id: string; nome: string } | null
  caso?: { id: string; nomeCompleto: string } | null
  titulo?: string 
  data?: string
  observacoes?: string | null
}