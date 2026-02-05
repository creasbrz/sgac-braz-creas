// frontend/src/types/group.ts

/**
 * Categorias de atividades coletivas suportadas pelo sistema.
 */
export type GroupActivityType = 
  | 'ACOLHIDA_COLETIVA' 
  | 'OFICINA' 
  | 'GRUPO_PAEFI' 
  | 'REUNIAO_REDE';

/**
 * Representa a presença de um assistido em uma atividade.
 */
export interface GroupParticipant {
  id: string
  grupoId: string
  casoId: string
  presente: boolean
  observacoes?: string
  
  // Dados desnormalizados do caso para exibição na lista
  caso: {
    id: string
    nomeCompleto: string
  }
}

/**
 * Entidade principal de Atividade Coletiva / Grupo.
 */
export interface GroupActivity {
  id: string
  tema: string
  tipo: GroupActivityType
  
  /** Data e Hora em formato ISO 8601 */
  dataRealizacao: string 
  
  local?: string
  descricao?: string
  orgaosEnvolvidos: string[]
  
  facilitador: { 
    id?: string
    nome: string 
  }

  /** * Contagem agregada (vinda do backend/Prisma) 
   * Útil para exibir nos cards sem carregar toda a lista
   */
  _count?: { 
    participantes: number 
  }
  
  /** * Flag calculada pelo backend.
   * Indica se a lista de presença já foi fechada/confirmada.
   */
  attendanceConfirmed?: boolean

  /** Lista completa de participantes (carregada sob demanda ou em detalhes) */
  participantes?: GroupParticipant[]
}

// --- TIPOS DE INPUT (Para formulários e API) ---

export interface CreateGroupDTO {
  tema: string
  tipo: GroupActivityType
  dataRealizacao: string
  local: string
  descricao?: string
  facilitadorId: string
}

export interface GroupAttendance {
  id: string
  casoId: string
  nomeParticipante: string
  presente: boolean
  observacoes?: string
}