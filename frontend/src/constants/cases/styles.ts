// frontend/src/constants/cases/styles.ts
import { CASE_STATUS, type CaseStatusType, URGENCIA_NIVEIS } from './definitions'

// --- 1. CONFIGURAÇÃO DE STATUS ---

interface StatusStyle {
  label: string
  className: string
}

export const STATUS_CONFIG: Record<CaseStatusType, StatusStyle> = {
  [CASE_STATUS.AGUARDANDO_ACOLHIDA]: {
    label: 'Aguardando Acolhida',
    // Amber (Amarelo Queimado) - Atenção Inicial
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  },
  [CASE_STATUS.EM_ACOLHIDA]: {
    label: 'Em Acolhida',
    // Blue - Processo Ativo
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
  },
  [CASE_STATUS.AGUARDANDO_DISTRIBUICAO]: {
    label: 'Aguardando Distribuição',
    // Purple - Transição Administrativa
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  [CASE_STATUS.EM_ACOLHIDA_ESPECIALIZADA]: {
    label: 'Acolhida Especializada',
    // Indigo - Técnico Especializado
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
  },
  [CASE_STATUS.EM_ACOMPANHAMENTO]: {
    label: 'Acompanhamento PAEFI',
    // Emerald (Verde) - Fluxo Contínuo/Saudável
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
  },
  [CASE_STATUS.EM_MONITORAMENTO]: {
    label: 'Em Monitoramento',
    // Cyan - Observação
    className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30'
  },
  [CASE_STATUS.DESLIGADO]: {
    label: 'Desligado',
    // Slate (Cinza) - Inativo
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'
  }
}

// --- 2. CONFIGURAÇÃO DE URGÊNCIA ---

// Mapeamento direto de Nível -> Estilo
const URGENCY_STYLES = {
  GRAVISSIMA: 'bg-red-100 text-red-800 border-red-300 font-bold dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',
  MUITO_GRAVE: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40',
  GRAVE: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/40',
  LEVE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
  DEFAULT: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
}

/**
 * Retorna as classes CSS baseadas no nível de urgência.
 * Usa um mapa de lookup para performance O(1).
 */
export function getUrgencyColor(urgencia: string | null | undefined): string {
  if (!urgencia) return URGENCY_STYLES.DEFAULT
  
  const term = urgencia.trim()

  // Verifica em qual array o termo se encontra
  if (includesTerm(URGENCIA_NIVEIS.GRAVISSIMA, term)) return URGENCY_STYLES.GRAVISSIMA
  if (includesTerm(URGENCIA_NIVEIS.MUITO_GRAVE, term)) return URGENCY_STYLES.MUITO_GRAVE
  if (includesTerm(URGENCIA_NIVEIS.GRAVE, term)) return URGENCY_STYLES.GRAVE
  if (includesTerm(URGENCIA_NIVEIS.LEVE, term)) return URGENCY_STYLES.LEVE

  return URGENCY_STYLES.DEFAULT
}

// Helper Type Guard para verificar arrays readonly de forma segura
function includesTerm(list: readonly string[] | string[], term: string): boolean {
  return list.includes(term)
}