// frontend/src/constants/caseStatus.ts

export const CASE_STATUSES = [
  'AGUARDANDO_ACOLHIDA',
  'EM_ACOLHIDA',
  'AGUARDANDO_DISTRIBUICAO_PAEFI',
  'EM_ACOLHIDA_ESPECIALIZADA',
  'EM_ACOMPANHAMENTO_PAEFI',
  'EM_MONITORAMENTO',
  'DESLIGADO',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]

type StatusDisplayConfig = {
  label: string
  color: 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'purple'
}

export const CASE_STATUS_MAP: Record<CaseStatus | 'DESCONHECIDO', StatusDisplayConfig> = {
  AGUARDANDO_ACOLHIDA: {
    label: 'Aguardando Acolhida',
    color: 'yellow',
  },
  EM_ACOLHIDA: {
    label: 'Em Acolhida',
    color: 'blue',
  },
  AGUARDANDO_DISTRIBUICAO_PAEFI: {
    label: 'Aguardando Distribuição',
    color: 'yellow',
  },
  EM_ACOLHIDA_ESPECIALIZADA: {
    label: 'Acolhida Especializada',
    color: 'purple',
  },
  EM_ACOMPANHAMENTO_PAEFI: {
    label: 'Acompanhamento PAEFI',
    color: 'green',
  },
  EM_MONITORAMENTO: {
    label: 'Em Monitoramento',
    color: 'gray',
  },
  DESLIGADO: {
    label: 'Desligado',
    color: 'red',
  },
  DESCONHECIDO: {
    label: 'Desconhecido',
    color: 'gray',
  },
}

export function getCaseStatusDisplay(status: string | null | undefined): StatusDisplayConfig {
  if (!status || !Object.keys(CASE_STATUS_MAP).includes(status)) {
    return CASE_STATUS_MAP.DESCONHECIDO
  }
  return CASE_STATUS_MAP[status as CaseStatus]
}