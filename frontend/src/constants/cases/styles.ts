// frontend/src/constants/cases/styles.ts
import { CASE_STATUS, CaseStatusType, URGENCIA_NIVEIS } from './definitions'

// Mapa de Labels e Estilos por Status
export const STATUS_CONFIG: Record<CaseStatusType, { label: string; style: string }> = {
  [CASE_STATUS.AGUARDANDO_ACOLHIDA]: {
    label: 'Aguardando Acolhida',
    style: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30'
  },
  [CASE_STATUS.EM_ACOLHIDA]: {
    label: 'Em Acolhida',
    style: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30'
  },
  [CASE_STATUS.AGUARDANDO_DISTRIBUICAO]: {
    label: 'Aguardando Distribuição',
    style: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30'
  },
  [CASE_STATUS.EM_ACOLHIDA_ESPECIALIZADA]: {
    label: 'Acolhida Especializada',
    style: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30'
  },
  [CASE_STATUS.EM_ACOMPANHAMENTO]: {
    label: 'Acompanhamento PAEFI',
    style: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30'
  },
  [CASE_STATUS.EM_MONITORAMENTO]: {
    label: 'Em Monitoramento',
    style: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30'
  },
  [CASE_STATUS.DESLIGADO]: {
    label: 'Desligado',
    style: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'
  }
}

// Função Helper para Cor de Urgência
export function getUrgencyColor(urgencia: string | null | undefined): string {
  if (!urgencia) return 'bg-slate-100 text-slate-600'
  
  const term = urgencia.trim()
  
  if (URGENCIA_NIVEIS.GRAVISSIMA.includes(term)) return 'bg-red-100 text-red-800 border-red-300 font-bold'
  if (URGENCIA_NIVEIS.MUITO_GRAVE.includes(term)) return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold'
  if (URGENCIA_NIVEIS.GRAVE.includes(term)) return 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium'
  if (URGENCIA_NIVEIS.LEVE.includes(term)) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  
  return 'bg-slate-100 text-slate-600'
}