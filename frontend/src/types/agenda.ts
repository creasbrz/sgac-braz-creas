// frontend/src/types/agenda.ts

// Define os tipos conhecidos para facilitar o autocomplete e evitar erros de digitação
export type AppointmentCategory = 
  | 'Atendimento' 
  | 'Visita' 
  | 'Retorno' 
  | 'Reunião' 
  | 'Grupo' 
  | 'Outro'
  | string // Permite outros valores caso venham do backend dinamicamente

export interface UpcomingAppointment {
  id: string
  titulo: string
  data: string // ISO 8601 Date string
  tipo: AppointmentCategory
  
  /** * Dados do caso vinculado. 
   * É opcional (?) pois agendamentos técnicos ou reuniões podem não estar ligados a um assistido.
   */
  caso?: {
    id: string
    nomeCompleto: string
  }
}