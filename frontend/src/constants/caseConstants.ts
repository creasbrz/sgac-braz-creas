// frontend/src/constants/caseConstants.ts

// ----------------------------------------------------------------------
// 1. MAPA DE STATUS (Cores e Labels)
// ----------------------------------------------------------------------

export const CASE_STATUS_MAP = {
  AGUARDANDO_ACOLHIDA: {
    text: 'Aguardando Acolhida',
    style: 'bg-secondary text-secondary-foreground border-secondary-foreground/20',
  },
  EM_ACOLHIDA: {
    text: 'Em Acolhida',
    style: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  AGUARDANDO_DISTRIBUICAO_PAEFI: {
    text: 'Aguardando Distribuição',
    style: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  EM_ACOMPANHAMENTO_PAEFI: {
    text: 'Acompanhamento PAEFI',
    style: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  DESLIGADO: {
    text: 'Desligado',
    style: 'bg-slate-100 text-slate-600 border-slate-200',
  },
} as const

export type CaseStatusIdentifier = keyof typeof CASE_STATUS_MAP

export function getCaseStatusInfo(status: string | null | undefined) {
  if (status && status in CASE_STATUS_MAP) {
    return CASE_STATUS_MAP[status as CaseStatusIdentifier]
  }
  return { text: 'Desconhecido', style: 'bg-muted text-muted-foreground' }
}

// ----------------------------------------------------------------------
// 2. MOTIVOS DE DESLIGAMENTO
// ----------------------------------------------------------------------

export const MOTIVOS_DESLIGAMENTO = [
  'Superação da situação de violação',
  'Usuário não localizado (Busca Ativa esgotada)', // [NOVO - Pedido 2]
  'Mudança de endereço para outra região',
  'Óbito do usuário',
  'Recusa de atendimento persistente',
  'Encaminhamento para Proteção Básica (CRAS)',
  'Acolhimento Institucional',
  'Transferência de Município'
]

// ----------------------------------------------------------------------
// 3. CLASSIFICAÇÃO DE URGÊNCIA (Semáforo de Cores)
// ----------------------------------------------------------------------

const URGENCIA_GRAVISSIMA = [
  'Convive com agressor',
  'Idoso 80+',
  'Primeira infância',
  'Risco de morte'
]

const URGENCIA_MUITO_GRAVE = [
  'Risco de reincidência',
  'Sofre ameaça',
  'Risco de desabrigo',
  'Criança/Adolescente'
]

const URGENCIA_GRAVE = [
  'PCD',
  'Idoso',
  'Internação',
  'Acolhimento',
  'Gestante/Lactante'
]

export function getUrgencyColor(urgencia: string | null | undefined): string {
  if (!urgencia) return 'bg-slate-100 text-slate-700 border-slate-200'

  const term = urgencia.trim()

  if (URGENCIA_GRAVISSIMA.includes(term)) {
    return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
  }

  if (URGENCIA_MUITO_GRAVE.includes(term)) {
    return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
  }

  if (URGENCIA_GRAVE.includes(term)) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200'
  }

  return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
}

export const URGENCY_STYLES = {}