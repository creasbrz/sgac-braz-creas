// src/types/group.ts

export type GroupType = 
  | 'OFICINA_REFLEXIVA'
  | 'RODA_CONVERSA'
  | 'ATIVIDADE_LUDICA'
  | 'PALESTRA'
  | 'EVENTO_COMUNITARIO'
  | 'REUNIAO_REDE'
  | 'OUTRO'

export interface GroupActivity {
  id: string
  tema: string
  tipo: GroupType
  dataRealizacao: string
  local?: string
  descricao?: string
  orgaosEnvolvidos: string[]
  
  facilitador?: { id: string; nome: string }
  _count?: { participantes: number }

  participantes?: GroupAttendance[]
  
  // [CORREÇÃO] Adicionada para compatibilidade
  attendanceConfirmed?: boolean
}

export interface GroupAttendance {
  id: string
  grupoId: string
  casoId: string
  presente: boolean
  observacoes?: string
  caso: {
    id: string
    nomeCompleto: string
  }
}

export interface CreateGroupDTO {
  tema: string
  tipo: GroupType
  datas: Date[]
  local?: string
  descricao?: string
  orgaosEnvolvidos?: string[]
}