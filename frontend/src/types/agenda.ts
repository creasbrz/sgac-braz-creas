// frontend/src/types/agenda.ts

export interface UpcomingAppointment {
  id: string
  titulo: string
  data: string // ISO Date string
  tipo: string
  // O '?' torna esta propriedade opcional, resolvendo o erro "Type undefined is not assignable..."
  caso?: {
    id: string
    nomeCompleto: string
  }
}