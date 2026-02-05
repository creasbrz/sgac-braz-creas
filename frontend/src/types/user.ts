// frontend/src/types/user.ts

/**
 * Papéis de usuário disponíveis no sistema.
 * Deve estar sincronizado com o Enum do Prisma e com a constante USER_ROLES do Zod.
 */
export type UserRole = 'Gerente' | 'Agente_Social' | 'Especialista' | 'Auditor'

/**
 * Representação completa do usuário autenticado ou listado.
 */
export interface User {
  id: string
  nome: string
  email: string
  cargo: UserRole
  
  /** Matrícula funcional (opcional, pode ser null no banco) */
  matricula?: string | null
  
  /** Indica se o usuário tem acesso ao sistema */
  ativo: boolean
  
  // Metadados de auditoria (ISO Date strings)
  createdAt?: string 
  updatedAt?: string
}

// --- TIPOS UTILITÁRIOS ---

/**
 * Interface para filtros na listagem de usuários
 */
export interface UserFilters {
  search?: string
  role?: UserRole | 'all'
  status?: 'active' | 'inactive' | 'all'
}