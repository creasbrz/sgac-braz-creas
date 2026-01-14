// frontend/src/constants/cases/caseTransitions.ts
import { type CaseStatusType } from './definitions'
import type { UserRole } from '@/types/user'

export type ActionType = 'status' | 'assign' | 'close'

// New type for Shadcn Button variants
export type ActionVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

export interface StatusAction {
  label: string
  type: ActionType
  nextStatus?: CaseStatusType
  allowedRoles: UserRole[]
  // [NEW] Maps directly to Shadcn Button 'variant' prop
  variant: ActionVariant 
}

export const caseTransitions: Partial<
  Record<CaseStatusType, StatusAction[]>
> = {
  AGUARDANDO_ACOLHIDA: [
    {
      label: 'Iniciar Acolhida',
      type: 'status',
      nextStatus: 'EM_ACOLHIDA',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'default', // Blue/Primary
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente_Social'],
      variant: 'secondary', // Gray/Neutral
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
      type: 'assign', // Triggers the assignment modal
      allowedRoles: ['Gerente'],
      variant: 'outline', // Distinct visual style for assignment
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
      variant: 'destructive', // Red/Danger
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
}

export function getAvailableActions(
  status: string | null | undefined,
  cargo: UserRole,
): StatusAction[] {
  if (!status) return []
  
  // Cast safe because we handle the undefined check above, 
  // but be aware that if 'status' is a string not in CaseStatusType, 
  // it will just return undefined from the object lookup, which we handle with || [].
  const safeStatus = status as CaseStatusType
  const possibleActions = caseTransitions[safeStatus] || []
  
  return possibleActions.filter(action => 
    action.allowedRoles.includes(cargo)
  )
}