// frontend/src/constants/cases/caseTransitions.ts
import type { CaseStatusType } from './definitions'
import type { UserRole } from '@/types/user'

// --- TIPOS ---

export type ActionType = 'status' | 'assign' | 'close'

// Variantes padrão do Shadcn/UI (compatíveis com temas Tailwind v4)
export type ActionVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link'

export interface StatusAction {
  readonly label: string
  readonly type: ActionType
  readonly nextStatus?: CaseStatusType
  readonly allowedRoles: readonly UserRole[]
  readonly variant: ActionVariant
}

// --- CONFIGURAÇÃO DE TRANSIÇÕES ---

/**
 * Mapeamento estático de transições permitidas por status.
 * 'as const' torna o objeto profundamente imutável (Readonly).
 */
export const CASE_TRANSITIONS: Partial<Record<CaseStatusType, readonly StatusAction[]>> = {
  AGUARDANDO_ACOLHIDA: [
    {
      label: 'Iniciar Acolhida',
      type: 'status',
      nextStatus: 'EM_ACOLHIDA',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'default', // Primary/Brand Color
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'secondary', // Muted/Gray
    },
  ],
  EM_ACOLHIDA: [
    {
      label: 'Encaminhar para Distribuição',
      type: 'status',
      nextStatus: 'AGUARDANDO_DISTRIBUICAO',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'default',
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'secondary',
    },
  ],
  AGUARDANDO_DISTRIBUICAO: [
    {
      label: 'Atribuir Especialista',
      type: 'assign',
      allowedRoles: ['Gerente'],
      variant: 'outline', // Bordered action
    },
  ],
  EM_ACOLHIDA_ESPECIALIZADA: [
    {
      label: 'Iniciar Acompanhamento',
      type: 'status',
      nextStatus: 'EM_ACOMPANHAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'default',
    },
    {
      label: 'Inserir em Monitoramento',
      type: 'status',
      nextStatus: 'EM_MONITORAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'secondary',
    },
    {
      label: 'Encerrar após Escuta',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'destructive', // Semantic Error/Danger Color
    },
  ],
  EM_ACOMPANHAMENTO: [
    {
      label: 'Mover para Monitoramento',
      type: 'status',
      nextStatus: 'EM_MONITORAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'secondary',
    },
    {
      label: 'Desligar Acompanhamento',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'destructive',
    },
  ],
  EM_MONITORAMENTO: [
    {
      label: 'Retomar para Acompanhamento',
      type: 'status',
      nextStatus: 'EM_ACOMPANHAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'default',
    },
    {
      label: 'Desligar (Fim Monitoramento)',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      variant: 'destructive',
    },
  ],
  DESLIGADO: [
    {
      label: 'Reabrir Caso',
      type: 'status',
      nextStatus: 'AGUARDANDO_ACOLHIDA',
      allowedRoles: ['Gerente'],
      variant: 'outline',
    },
  ],
} as const

// Mantendo compatibilidade com importações antigas se necessário
export const caseTransitions = CASE_TRANSITIONS;

// --- HELPER FUNCTIONS ---

export function getAvailableActions(
  status: string | null | undefined,
  cargo: UserRole,
): readonly StatusAction[] {
  if (!status) return []
  
  // Type Guard implícito ao acessar o objeto
  const actions = CASE_TRANSITIONS[status as CaseStatusType]
  
  if (!actions) return []
  
  return actions.filter(action => 
    action.allowedRoles.includes(cargo)
  )
}