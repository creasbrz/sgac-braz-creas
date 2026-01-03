// frontend/src/schemas/userSchemas.ts
import { z } from 'zod'

export const editUserFormSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  
  // Adicionado Tecnico_Admin para consistência com o Backend
  cargo: z.enum(['Gerente', 'Agente_Social', 'Especialista', 'Tecnico_Admin'], {
    message: "É obrigatório selecionar um cargo válido.",
  }),
})

export type EditUserFormData = z.infer<typeof editUserFormSchema>