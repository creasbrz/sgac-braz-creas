// frontend/src/schemas/userSchemas.ts
import { z } from 'zod'

// --- CONSTANTES ---
// O 'as const' é CRUCIAL aqui para o z.enum aceitar o array como uma tupla literal
export const USER_ROLES = ['Gerente', 'Agente_Social', 'Especialista', 'Auditor'] as const

// --- BASE SCHEMA ---
const baseUserSchema = z.object({
  nome: z.string()
    .min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' })
    .trim(),
  
  email: z.string()
    .email({ message: 'Por favor, insira um endereço de e-mail válido.' })
    .toLowerCase()
    .trim(),

  // [CORREÇÃO]
  // Em vez de 'errorMap', usamos 'message' ou 'required_error'/'invalid_type_error'
  // conforme a sugestão do seu compilador TypeScript.
  cargo: z.enum(USER_ROLES, {
    message: "É obrigatório selecionar um cargo válido."
  }),
})

// --- SCHEMAS DE FORMULÁRIO ---

// 1. Edição
export const editUserFormSchema = baseUserSchema

// 2. Criação
export const newUserFormSchema = baseUserSchema.extend({
  matricula: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val),
  
  senhaInicial: z.string()
    .min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
    .default('123456')
})

// --- TYPES INFERIDOS ---
export type EditUserFormData = z.infer<typeof editUserFormSchema>
export type NewUserFormData = z.infer<typeof newUserFormSchema>
export type UserRole = typeof USER_ROLES[number]