// frontend/src/schemas/userSchemas.ts
import { z } from 'zod'

export const editUserFormSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  // [CORREÇÃO] Atualizado para Agente_Social
  cargo: z.enum(['Gerente', 'Agente_Social', 'Especialista'], {
    message: "É obrigatório selecionar um cargo.",
  }),
})