// frontend/src/constants/caseTransitions.ts

// 1. Tipagem mais forte para os cargos, evitando erros de digitação.
export type UserRole = 'Gerente' | 'Agente Social' | 'Especialista'

// Define os status possíveis de forma tipada
export type CaseStatus =
  | 'Aguardando Acolhida'
  | 'Em Acolhida'
  | 'Aguardando Distribuição PAEFI'
  | 'Em Acompanhamento PAEFI'
  | 'Desligado'

// 2. Centralização dos estilos dos botões para consistência visual.
const buttonStyles = {
  success: 'bg-green-600 hover:bg-green-700',
  danger: 'bg-red-600 hover:bg-red-700',
  neutral: 'bg-gray-600 hover:bg-gray-700',
  accent: 'bg-purple-600 hover:bg-purple-700',
  primary: 'bg-blue-600 hover:bg-blue-700',
}

// 3. Tipos de Ação para mapear com as rotas do backend e a lógica do frontend.
export type ActionType = 'status' | 'assign' | 'close'

// 4. Interface de Ação expandida para ser mais descritiva.
export interface StatusAction {
  label: string
  type: ActionType
  nextStatus?: CaseStatus // Opcional, pois ações como 'assign' e 'close' já definem o status no backend.
  allowedRoles: UserRole[]
  style: string
}

// Mapeia o status atual para as ações possíveis a partir dele.
export const caseTransitions: Partial<Record<CaseStatus, StatusAction[]>> = {
  'Aguardando Acolhida': [
    {
      label: 'Iniciar Acolhida',
      type: 'status',
      nextStatus: 'Em Acolhida',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.success,
    },
  ],
  'Em Acolhida': [
    {
      label: 'Desligamento Simplificado',
      type: 'status',
      nextStatus: 'Desligado',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.neutral,
    },
    {
      label: 'Encaminhar para PAEFI',
      type: 'status',
      nextStatus: 'Aguardando Distribuição PAEFI',
      allowedRoles: ['Gerente', 'Agente Social'],
      style: buttonStyles.accent,
    },
  ],
  // 5. Adicionada a transição que estava em falta.
  'Aguardando Distribuição PAEFI': [
    {
      label: 'Atribuir Especialista',
      type: 'assign',
      allowedRoles: ['Gerente'],
      style: buttonStyles.primary,
    },
  ],
  'Em Acompanhamento PAEFI': [
    {
      label: 'Desligar Acompanhamento',
      type: 'close',
      allowedRoles: ['Gerente', 'Especialista'],
      style: buttonStyles.danger,
    },
  ],
}

