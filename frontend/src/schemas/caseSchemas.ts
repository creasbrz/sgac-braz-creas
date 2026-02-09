// frontend/src/schemas/caseSchemas.ts
import { z } from 'zod'
import { OCUPACOES_ROL } from '@/constants/options'

// --- HELPERS ---

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
)

// [NOVO] Schema para tratar input monetário (string formatada -> number)
const currencySchema = z.union([
  z.number(),
  z.string().transform((val) => {
    if (!val) return 0;
    // Remove tudo que não é dígito ou vírgula
    const clean = val.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  })
])

// --- SUB-SCHEMAS ---

const contactSchema = z.object({
  numero: z.string().min(8, 'Número inválido (mínimo 8 dígitos).'),
  tipo: z.enum(["Pessoal", "Residencial", "Trabalho", "Vizinho", "Parente", "Outro"], {
    errorMap: () => ({ message: "Selecione o tipo de contato." })
  } as any),
  nome: emptyToUndefined,
  observacao: emptyToUndefined,
})

const addressSchema = z.object({
  ra: z.string().min(1, 'Selecione a Região Administrativa.'),
  logradouro: z.string().min(3, 'O logradouro é obrigatório.'),
  complemento: emptyToUndefined,
  bairro: emptyToUndefined,
  cidade: z.string().default("Brasília"),
  uf: z.string().default("DF"),
  cep: emptyToUndefined,
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
})

// --- SCHEMA PRINCIPAL ---

export const createCaseFormSchema = z.object({
  // 1. Identificação
  nomeCompleto: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  nomeSocial: emptyToUndefined,
  
  cpf: z.string().transform(v => v.replace(/\D/g, '')).refine((val) => val.length === 11, 'CPF inválido (11 dígitos).'),
  
  nascimento: z.string().refine((val) => val.length > 0, 'Data de nascimento obrigatória.'),
  sexo: z.string().min(1, 'Selecione o sexo.'),

  // [NOVO v8.2] Campo de E-mail (Opcional, mas validado se preenchido)
  email: z.union([
    z.literal(''), 
    z.string().email('Formato de e-mail inválido.')
  ]).optional().nullable(),

  ocupacao: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.enum([...OCUPACOES_ROL] as [string, ...string[]])
      .or(z.string())
      .optional()
  ),
  
  // [CORREÇÃO v1.0.1] Uso do schema de moeda robusto
  renda: currencySchema.optional().default(0),

  // 2. Contatos e Endereço
  contatos: z.array(contactSchema).min(1, "Adicione pelo menos um telefone."),
  endereco: addressSchema,

  // 3. Responsável Legal
  responsavelLegal: emptyToUndefined,
  parentescoResponsavel: emptyToUndefined,

  // 4. Dados Técnicos
  dataEntrada: z.string().refine((val) => val.length > 0, 'Data de entrada obrigatória.'),
  urgencia: z.string().min(1, 'Selecione a urgência.'),
  violacao: z.array(z.string()).min(1, 'Selecione ao menos uma violação.'),
  categoria: z.string().min(1, 'Selecione a categoria.'),
  
  orgaoDemandante: z.string().min(2, 'Informe o órgão demandante.'),
  
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA'], {
    errorMap: () => ({ message: "Selecione a origem." })
  } as any),

  // 5. Relacionamentos
  agenteAcolhidaId: emptyToUndefined,

  // 6. Administrativo
  numeroSei: emptyToUndefined,
  linkSei: emptyToUndefined,
  observacoes: emptyToUndefined,
  beneficios: z.array(z.string()).default([]),
})

export type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

export const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'Detalhe o diagnóstico.'),
  objetivos: z.string().min(5, 'Descreva os objetivos.'),
  estrategias: z.string().min(5, 'Descreva as estratégias.'),
  deadline: z.string().refine((val) => val !== '', 'Data obrigatória.'),
})

export const evolutionFormSchema = z.object({
  conteudo: z.string().min(5, 'Mínimo 5 caracteres.'),
  sigilo: z.boolean().default(false)
})

export const closeCaseFormSchema = z.object({
  motivoDesligamento: z.string().min(1, 'Selecione um motivo.'),
  destinoDesligamento: z.string().min(1, 'Selecione o destino.'),
  parecerFinal: z.string().min(10, 'Parecer detalhado obrigatório.'),
  // [NOVO] Flag
  manterReferencia: z.boolean().default(false),
})