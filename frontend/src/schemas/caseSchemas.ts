// frontend/src/schemas/caseSchemas.ts
import { z } from 'zod'

// Esquema para criação/edição de casos
export const createCaseFormSchema = z.object({
  nomeCompleto: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().min(11, 'CPF inválido.'),
  nascimento: z.string().refine((val) => val !== '', 'Data de nascimento obrigatória.'),
  sexo: z.string().min(1, 'Selecione o sexo.'),
  telefone: z.string().min(10, 'Telefone inválido.'),
  endereco: z.string().min(5, 'Endereço muito curto.'),
  dataEntrada: z.string(), // Aceita qualquer string de data ISO
  
  urgencia: z.string().min(1, 'Selecione a urgência.'),
  violacao: z.string().min(1, 'Selecione a violação.'),
  categoria: z.string().min(1, 'Selecione a categoria.'),
  
  orgaoDemandante: z.string().min(2, 'Informe o órgão demandante.'),
  agenteAcolhidaId: z.string().uuid('Selecione um agente válido.'),
  
  // Campos Opcionais (tratamento para string vazia ou null)
  numeroSei: z.string().optional().nullable().or(z.literal('')),
  
  // Aceita: URL válida, string vazia ("") ou null/undefined
  linkSei: z.union([
    z.string().url('URL inválida (ex: https://...)'), 
    z.literal(''), 
    z.null(), 
    z.undefined()
  ]).optional(),

  observacoes: z.string().optional().nullable().or(z.literal('')),
  beneficios: z.array(z.string()).optional(),
})

export type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

// Esquema para o PAF
export const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico deve ser mais detalhado.'),
  objetivos: z.string().min(10, 'Descreva os objetivos.'),
  estrategias: z.string().min(10, 'Descreva as estratégias.'),
  deadline: z.string().refine((val) => val !== '', 'Data de reavaliação obrigatória.'),
})

// [RECUPERADO] Esquema para Evolução
export const evolutionFormSchema = z.object({
  conteudo: z.string().min(5, 'A evolução deve ter pelo menos 5 caracteres.'),
})

// [RECUPERADO] Esquema para Desligamento
export const closeCaseFormSchema = z.object({
  motivoDesligamento: z.string().min(1, 'Selecione um motivo de desligamento.'),
  parecerFinal: z.string().min(10, 'O parecer final deve ser detalhado.'),
})