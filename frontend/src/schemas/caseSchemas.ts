// frontend/src/schemas/caseSchemas.ts
import { z } from 'zod'
import { OCUPACOES_ROL } from '@/constants/options' // [CORREÇÃO] Importando

// --- SUB-SCHEMAS ---

const contactSchema = z.object({
  numero: z.string().min(8, 'Número inválido (mínimo 8 dígitos).'),
  tipo: z.enum(["Pessoal", "Residencial", "Trabalho", "Vizinho", "Parente", "Outro"], {
    errorMap: () => ({ message: "Selecione o tipo de contato." })
  }),
  nome: z.string().optional(),
  observacao: z.string().optional(),
})

const addressSchema = z.object({
  ra: z.string().min(1, 'Selecione a Região Administrativa.'),
  logradouro: z.string().min(3, 'O logradouro é obrigatório (Qd, Rua, Av).'),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().default("Brasília"),
  uf: z.string().default("DF"),
  cep: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
})

// --- SCHEMA PRINCIPAL ---

export const createCaseFormSchema = z.object({
  // 1. Identificação
  nomeCompleto: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  nomeSocial: z.string().optional(),
  cpf: z.string().min(11, 'CPF inválido.'),
  nascimento: z.string().refine((val) => val.length > 0, 'Data de nascimento obrigatória.'),
  sexo: z.string().min(1, 'Selecione o sexo.'),

  // [CORREÇÃO] Usando o Rol importado
  ocupacao: z.enum(OCUPACOES_ROL).or(z.string()).optional(),
  
  renda: z.coerce.number().optional().default(0),

  // 2. Contatos e Endereço
  contatos: z.array(contactSchema).min(1, "Adicione pelo menos um telefone de contato."),
  endereco: addressSchema,

  // 3. Responsável Legal
  responsavelLegal: z.string().optional(),
  parentescoResponsavel: z.string().optional(),

  // 4. Dados Técnicos
  dataEntrada: z.string().refine((val) => val.length > 0, 'Data de entrada obrigatória.'),
  urgencia: z.string().min(1, 'Selecione a urgência.'),
  violacao: z.array(z.string()).min(1, 'Selecione ao menos uma violação.'),
  categoria: z.string().min(1, 'Selecione a categoria (Público-alvo).'),
  orgaoDemandante: z.string().min(2, 'Informe o órgão demandante.'),
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA'], {
    errorMap: () => ({ message: "Selecione a origem do caso." })
  }),

  // 5. Relacionamentos
  agenteAcolhidaId: z.string().optional().or(z.literal('')),

  // 6. Administrativo
  numeroSei: z.string().optional(),
  linkSei: z.string().optional(),
  observacoes: z.string().optional(),
  beneficios: z.array(z.string()).default([]),
})

export type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

// --- OUTROS SCHEMAS ---

export const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico deve ser mais detalhado.'),
  objetivos: z.string().min(10, 'Descreva os objetivos.'),
  estrategias: z.string().min(10, 'Descreva as estratégias.'),
  deadline: z.string().refine((val) => val !== '', 'Data de reavaliação obrigatória.'),
})

export const evolutionFormSchema = z.object({
  conteudo: z.string().min(5, 'A evolução deve ter pelo menos 5 caracteres.'),
  sigilo: z.boolean().default(false)
})

export const closeCaseFormSchema = z.object({
  motivoDesligamento: z.string().min(1, 'Selecione um motivo de desligamento.'),
  destinoDesligamento: z.string().min(1, 'Selecione o destino do caso.'),
  parecerFinal: z.string().min(10, 'O parecer final deve ser detalhado.'),
})