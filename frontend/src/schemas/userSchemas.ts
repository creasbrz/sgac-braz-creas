// frontend/src/schemas/userSchemas.ts
import { z } from 'zod'

export const editUserFormSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  
  // [CORREÇÃO] Adicionada a opção 'Auditor' na validação
  cargo: z.enum(['Gerente', 'Agente_Social', 'Especialista', 'Auditor'], {
    message: "É obrigatório selecionar um cargo.",
  }),
})

// Caso você tenha um schema separado para criação (NewUser), atualize ele também:
export const newUserFormSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  matricula: z.string().optional(),
  cargo: z.enum(['Gerente', 'Agente_Social', 'Especialista', 'Auditor'], {
    message: "É obrigatório selecionar um cargo.",
  }),
  senhaInicial: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').default('123456')
})