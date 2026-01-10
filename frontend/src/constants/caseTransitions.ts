// frontend/src/constants/caseTransitions.ts
import { type CaseStatusIdentifier } from './caseConstants'
import type { UserRole } from '@/types/user'

const buttonStyles = {
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  neutral: 'bg-muted text-muted-foreground hover:bg-muted/90',
  accent: 'bg-purple-600 hover:bg-purple-700 text-white',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  info: 'bg-cyan-600 hover:bg-cyan-700 text-white',
}

export type ActionType = 'status' | 'assign' | 'close'

export interface StatusAction {
  label: string
  type: ActionType
  nextStatus?: CaseStatusIdentifier
  allowedRoles: UserRole[]
  style: string
}

export const caseTransitions: Partial<
  Record<CaseStatusIdentifier, StatusAction[]>
> = {
  AGUARDANDO_ACOLHIDA: [
    {
      label: 'Iniciar Acolhida',
      type: 'status',
      nextStatus: 'EM_ACOLHIDA',
      allowedRoles: ['Gerente', 'Agente_Social'],
      style: buttonStyles.success,
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente_Social'],
      style: buttonStyles.neutral,
    },
  ],
  EM_ACOLHIDA: [
    {
      label: 'Encaminhar para Distribuição',
      type: 'status',
      nextStatus: 'AGUARDANDO_DISTRIBUICAO',
      allowedRoles: ['Gerente', 'Agente_Social'],
      style: buttonStyles.accent,
    },
    {
      label: 'Desligamento Simplificado',
      type: 'close',
      allowedRoles: ['Gerente', 'Agente_Social'],
      style: buttonStyles.neutral,
    },
  ],
  AGUARDANDO_DISTRIBUICAO: [
    {
      label: 'Atribuir Especialista',
      type: 'assign', // Abre modal de seleção
      allowedRoles: ['Gerente'],
      style: buttonStyles.primary,
    },
  ],
  EM_ACOLHIDA_ESPECIALIZADA: [
    {
      label: 'Iniciar Acompanhamento',
      type: 'status',
      nextStatus: 'EM_ACOMPANHAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.success,
    },
    // [NOVO] Permite pular direto para monitoramento se for caso leve
    {
      label: 'Inserir em Monitoramento',
      type: 'status',
      nextStatus: 'EM_MONITORAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.info,
    },
    {
      label: 'Encerrar após Escuta',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.danger,
    },
  ],
  EM_ACOMPANHAMENTO: [
    {
      label: 'Mover para Monitoramento',
      type: 'status',
      nextStatus: 'EM_MONITORAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.info,
    },
    {
      label: 'Desligar Acompanhamento',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.danger,
    },
  ],
  EM_MONITORAMENTO: [
    {
      label: 'Retomar para Acompanhamento',
      type: 'status',
      nextStatus: 'EM_ACOMPANHAMENTO',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.success,
    },
    {
      label: 'Desligar (Fim Monitoramento)',
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

export function getAvailableActions(
  status: string | null | undefined, // [CORREÇÃO] Tipagem mais flexível para evitar erros
  cargo: UserRole,
): StatusAction[] {
  if (!status) return []
  const safeStatus = status as CaseStatusIdentifier
  const possibleActions = caseTransitions[safeStatus] || []
  
  return possibleActions.filter(action => 
    action.allowedRoles.includes(cargo)
  )
}