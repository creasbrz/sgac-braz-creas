// frontend/src/constants/caseConstants.ts

export type UserRole = 'Gerente' | 'Agente Social' | 'Especialista'

export type CaseStatusIdentifier =
  | 'AGUARDANDO_ACOLHIDA'
  | 'EM_ACOLHIDA'
  | 'AGUARDANDO_DISTRIBUICAO_PAEFI'
  | 'EM_ACOMPANHAMENTO_PAEFI'
  | 'DESLIGADO'

interface StatusInfo {
  text: string
  style: string
}

export const CASE_STATUS_MAP: Record<CaseStatusIdentifier, StatusInfo> = {
  AGUARDANDO_ACOLHIDA: {
    text: 'Aguardando Acolhida',
    style: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  },
  EM_ACOLHIDA: {
    text: 'Em Acolhida',
    style: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  AGUARDANDO_DISTRIBUICAO_PAEFI: {
    text: 'Aguardando Distribuição PAEFI',
    style: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  EM_ACOMPANHAMENTO_PAEFI: {
    text: 'Em Acompanhamento PAEFI',
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  DESLIGADO: {
    text: 'Desligado',
    style: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  },
}

