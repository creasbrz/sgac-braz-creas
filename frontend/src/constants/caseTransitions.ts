// frontend/src/constants/caseTransitions.ts
import {
  type CaseStatusIdentifier,
  // REMOVIDO: getCaseStatusInfo
} from './caseConstants'
// ADICIONADO: Importação correta do tipo UserRole
import type { UserRole } from '@/types/user'

const buttonStyles = {
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  neutral: 'bg-muted text-muted-foreground hover:bg-muted/90',
  accent: 'bg-purple-600 hover:bg-purple-700 text-white',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
}

export type ActionType = 'status' | 'assign' | 'close'

export interface StatusAction {
  label: string
  type: ActionType
  nextStatus?: CaseStatusIdentifier
  allowedRoles: UserRole[]
  style: string
}

// ... (O objeto caseTransitions permanece igual) ...
export const caseTransitions: Partial<
  Record<CaseStatusIdentifier, StatusAction[]>
> = {
  AGUARDANDO_ACOLHIDA: [
    {
      label: 'Iniciar Acolhida',
      type: 'status',
      nextStatus: 'EM_ACOLHIDA',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.success,
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.neutral,
    },
  ],
  EM_ACOLHIDA: [
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.neutral,
    },
    {
      label: 'Encaminhar para PAEFI',
      type: 'status',
      nextStatus: 'AGUARDANDO_DISTRIBUICAO_PAEFI',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.accent,
    },
  ],
  AGUARDANDO_DISTRIBUICAO_PAEFI: [
    {
      label: 'Atribuir Especialista',
      type: 'assign',
      allowedRoles: ['Gerente'],
      style: buttonStyles.primary,
    },
  ],
  EM_ACOMPANHAMENTO_PAEFI: [
    {
      label: 'Desligar Acompanhamento',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.danger,
    },
  ],
  DESLIGADO: [
    {
      label: 'Reabrir Caso',
      type: 'status',
      nextStatus: 'AGUARDANDO_ACOLHIDA',
      allowedRoles: ['Gerente'],
      style: buttonStyles.primary,
    },
  ],
}

// ... (A função getAvailableActions permanece igual) ...
export function getAvailableActions(
  status: CaseStatusIdentifier,
  cargo: UserRole,
): StatusAction[] {
  const possibleActions = caseTransitions[status] || []
  
  return possibleActions.filter(action => 
    action.allowedRoles.includes(cargo)
  )
}