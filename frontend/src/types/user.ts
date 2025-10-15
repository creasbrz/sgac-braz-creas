// frontend/src/types/user.ts

export type UserRole = 'Gerente' | 'Agente Social' | 'Especialista'

export interface User {
  id: string
  nome: string
  cargo: UserRole
  email: string
}
