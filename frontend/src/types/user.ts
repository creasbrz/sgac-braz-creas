// frontend/src/types/user.ts

// Define os cargos disponíveis no sistema (deve bater com o schema.prisma)
export type UserRole = 'Gerente' | 'Agente_Social' | 'Especialista' | 'Auditor'

export interface User {
  id: string
  nome: string
  email: string
  cargo: UserRole
  matricula?: string | null
  ativo: boolean
  
  // Opcionais: úteis se você for exibir datas na listagem
  createdAt?: string 
  updatedAt?: string
}