// frontend/src/types/group.ts
export interface GroupActivity {
  id: string
  tema: string
  tipo: 'ACOLHIDA_COLETIVA' | 'OFICINA' | 'GRUPO_PAEFI' | 'REUNIAO_REDE'
  dataRealizacao: string
  local?: string
  descricao?: string
  orgaosEnvolvidos: string[]
  facilitador: { nome: string }
  _count?: { participantes: number }
  
  // [NOVO] Flag calculada no backend
  attendanceConfirmed?: boolean

  participantes?: GroupAttendance[]
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