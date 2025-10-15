// frontend/src/constants/caseTransitions.ts
import {
  type UserRole,
  type CaseStatusIdentifier,
} from './caseConstants'

const buttonStyles = {
  success: 'bg-green-600 hover:bg-green-700',
  danger: 'bg-red-600 hover:bg-red-700',
  neutral: 'bg-gray-600 hover:bg-gray-700',
  accent: 'bg-purple-600 hover:bg-purple-700',
  primary: 'bg-blue-600 hover:bg-blue-700',
}

export type ActionType = 'status' | 'assign' | 'close'

export interface StatusAction {
  label: string
  type: ActionType
  nextStatus?: CaseStatusIdentifier
  allowedRoles: UserRole[]
  style: string
}

// Correção: Garante que o Record usa o tipo de identificador correto.
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
  ],
  EM_ACOLHIDA: [
    {
      label: 'Desligamento Simplificado',
      type: 'status',
      nextStatus: 'DESLIGADO',
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
}