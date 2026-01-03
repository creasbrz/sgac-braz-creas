// src/types/user.ts

export type UserRole = 'Gerente' | 'Especialista' | 'Agente_Social' | 'Tecnico_Admin'

export interface User {
  id: string
  nome: string
  email: string
  cargo: UserRole
  ativo: boolean
  createdAt?: string
  updatedAt?: string
  
  // [CORREÇÃO] Adicionada para compatibilidade
  matricula?: string | null
}

export interface DecodedToken {
  sub: string
  cargo: UserRole
  nome: string
  exp: number
  iat: number
}