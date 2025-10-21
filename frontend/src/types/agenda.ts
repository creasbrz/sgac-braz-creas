// frontend/src/types/agenda.ts

export interface UpcomingAppointment {
  id: string
  titulo: string
  data: string
  caso: {
    id: string
    nomeCompleto: string
  }
}