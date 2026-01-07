// frontend/src/types/user.ts

// [CORREÇÃO] Adicione o underline
export type UserRole = 'Gerente' | 'Agente_Social' | 'Especialista' | 'Auditor'

export interface User {
  id: string
  nome: string
  cargo: UserRole
  email: string
  matricula?: string | null
  ativo: boolean
}