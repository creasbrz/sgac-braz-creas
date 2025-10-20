// frontend/src/schemas/userSchemas.ts
import { z } from 'zod'

export const editUserFormSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Por favor, insira um email válido.'),
  // Correção: `z.enum` aceita um parâmetro 'message' para todos os erros.
  // Como o <Select> envia uma string vazia ("") quando nada é selecionado,
  // e "" não é um valor válido do enum, esta mensagem será exibida.
  cargo: z.enum(['Gerente', 'Agente Social', 'Especialista'], {
    message: "É obrigatório selecionar um cargo.",
  }),
})