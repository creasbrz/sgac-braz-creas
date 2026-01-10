// ============================================================================
// 1. STATUS E MAPAS VISUAIS
// ============================================================================
export const CASE_STATUS_MAP = {
  AGUARDANDO_ACOLHIDA: {
    text: 'Aguardando Acolhida',
    style: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  EM_ACOLHIDA: {
    text: 'Em Acolhida',
    style: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  AGUARDANDO_DISTRIBUICAO: {
    text: 'Aguardando Distribuição',
    style: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  },
  EM_ACOLHIDA_ESPECIALIZADA: {
    text: 'Acolhida Especializada',
    style: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  },
  EM_ACOMPANHAMENTO: {
    text: 'Acompanhamento PAEFI',
    style: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  },
  EM_MONITORAMENTO: {
    text: 'Em Monitoramento',
    style: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  },
  DESLIGADO: {
    text: 'Desligado',
    style: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
} as const

export type CaseStatusIdentifier = keyof typeof CASE_STATUS_MAP

export function getCaseStatusInfo(status: string | null | undefined) {
  if (status && status in CASE_STATUS_MAP) {
    return CASE_STATUS_MAP[status as CaseStatusIdentifier]
  }
  return { text: status?.replace(/_/g, ' ') || 'Desconhecido', style: 'bg-muted text-muted-foreground' }
}

// ============================================================================
// 2. LISTAS DE DOMÍNIO (MOTIVOS, DESTINOS) - AQUI ESTAVA O ERRO
// ============================================================================
export const MOTIVOS_DESLIGAMENTO = [
  'Transferência de território',
  'Falecimento do(a) usuário(a)',
  'Recusa do atendimento por parte do(a) usuário(a)',
  'Usuário(a) não localizado(a) após tentativas exaustivas',
  'Usuário(a) acolhido(a)',
  'Crianças e adolescentes inseridos em serviço de acolhimento institucional',
  'Minimização dos riscos (Autonomia)',
  'Situação não pertencente à demanda do CREAS'
]

export const DESTINOS_DESLIGAMENTO = [
  'Referenciado ao CRAS (PAIF)',
  'Serviço de Saúde (CAPS/UBS)',
  'Sistema de Justiça',
  'Acolhimento Institucional',
  'Superação da Vulnerabilidade (Autonomia)',
  'Mudança de Município/Estado',
  'Outro'
]

// ============================================================================
// 3. DEFINIÇÕES DE URGÊNCIA
// ============================================================================
export const URGENCIA_GRAVISSIMA = [  
  'CONVIVE COM AGRESSOR', 'IDOSO 80+', 'PRIMEIRA INFÂNCIA', 
  'RISCO DE MORTE', 'VIOLÊNCIA SEXUAL', 'VIOLENCIA SEXUAL'
]

export const URGENCIA_MUITO_GRAVE = [
  'RISCO DE REINCIDÊNCIA', 'RISCO DE REINCIDENCIA',
  'SOFRE AMEAÇA', 'SOFRE AMEACA', 'RISCO DE DESABRIGO', 
  'CRIANÇA/ADOLESCENTE', 'CRIANCA/ADOLESCENTE'
]

export const URGENCIA_GRAVE = [
 'PCD', 'IDOSO', 
 'INTERNAÇÃO', 'INTERNACAO', 'ACOLHIMENTO', 'GESTANTE/LACTANTE'
]

export const URGENCIA_LEVE = [
  'SEM RISCO IMEDIATO', 'VISITA PERIÓDICA'
]

// ============================================================================
// 4. FUNÇÃO DE COR DA URGÊNCIA
// ============================================================================
export function getUrgencyColor(urgencia: string | null | undefined): string {
  if (!urgencia) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
  
  const term = urgencia.toUpperCase().trim()
  const check = (list: readonly string[]) => list.some(k => term === k || term.includes(k))

  // 1. VERMELHO (GRAVÍSSIMA)
  if (check(URGENCIA_GRAVISSIMA)) {
    return 'bg-red-100 text-red-800 border-red-300 font-bold hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
  }

  // 2. LARANJA (MUITO GRAVE / ALTA)
  if (check(URGENCIA_MUITO_GRAVE)) {
    return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700'
  }

  // 3. AMARELO (GRAVE / MÉDIA)
  if (check(URGENCIA_GRAVE)) {
     return 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
  }

  // 4. VERDE (LEVE / BAIXA)
  if (check(URGENCIA_LEVE)) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
  }

  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
}