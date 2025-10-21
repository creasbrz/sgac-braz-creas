// frontend/src/constants/caseConstants.ts
export type UserRole = 'Gerente' | 'Agente Social' | 'Especialista'

export type CaseStatusIdentifier =
  | 'AGUARDANDO_ACOLHIDA'
  | 'EM_ACOLHIDA'
  | 'AGUARDANDO_DISTRIBUICAO_PAEFI'
  | 'EM_ACOMPANHAMENTO_PAEFI'
  | 'DESLIGADO'

export const CASE_STATUS_MAP: Record<CaseStatusIdentifier, { text: string, style: string }> = {
  AGUARDANDO_ACOLHIDA: { text: 'Aguardando Acolhida', style: 'bg-yellow-100 text-yellow-800' },
  EM_ACOLHIDA: { text: 'Em Acolhida', style: 'bg-blue-100 text-blue-800' },
  AGUARDANDO_DISTRIBUICAO_PAEFI: { text: 'Aguardando Distribuição PAEFI', style: 'bg-orange-100 text-orange-800' },
  EM_ACOMPANHAMENTO_PAEFI: { text: 'Acompanhamento PAEFI', style: 'bg-green-100 text-green-800' },
  DESLIGADO: { text: 'Desligado', style: 'bg-gray-100 text-gray-800' },
}

// Lista oficial de motivos de desligamento
export const MOTIVOS_DESLIGAMENTO = [
  'Mudança de território',
  'Falecimento',
  'Recusa de atendimento',
  'Violação cessada',
  'Contrareferenciamento',
  'Não localizado',
  'Acolhimento',
]