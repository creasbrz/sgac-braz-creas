import { z } from 'zod'

// --- SUB-SCHEMAS (Novas Estruturas) ---

// Item 1: Contato Estruturado
const contactSchema = z.object({
  numero: z.string().min(8, 'Número inválido (mínimo 8 dígitos).'),
  tipo: z.enum(["Pessoal", "Residencial", "Trabalho", "Vizinho", "Parente", "Outro"], {
    errorMap: () => ({ message: "Selecione o tipo de contato." })
  }),
  nome: z.string().optional(), // Ex: Nome da vizinha que dá recado
  observacao: z.string().optional(),
})

// Item 2: Endereço Detalhado (Padrão DF)
const addressSchema = z.object({
  ra: z.string().min(1, 'Selecione a Região Administrativa.'), // Campo Obrigatório
  logradouro: z.string().min(3, 'O logradouro é obrigatório (Qd, Rua, Av).'),
  complemento: z.string().optional(),
  bairro: z.string().optional(), // Geralmente redundante com RA no DF, mas útil
  cidade: z.string().default("Brasília"),
  uf: z.string().default("DF"),
  cep: z.string().optional(), // Pode adicionar validação de regex se quiser: /^\d{5}-\d{3}$/
})

// --- SCHEMA PRINCIPAL DE CRIAÇÃO ---

export const createCaseFormSchema = z.object({
  // Identificação
  nomeCompleto: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  nomeSocial: z.string().optional(), // Novo campo de inclusão
  cpf: z.string().min(11, 'CPF inválido.'), // Idealmente usar biblioteca de validação de CPF
  nascimento: z.string().refine((val) => val.length > 0, 'Data de nascimento obrigatória.'),
  sexo: z.string().min(1, 'Selecione o sexo.'),

  // Novos Campos Estruturados
  contatos: z.array(contactSchema).min(1, "Adicione pelo menos um telefone de contato."),
  endereco: addressSchema,

  // Item 3: Responsável Legal (Opcional no schema, obrigatório visualmente se < 18 anos)
  responsavelLegal: z.string().optional(),
  parentescoResponsavel: z.string().optional(),

  // Dados Técnicos
  dataEntrada: z.string().refine((val) => val.length > 0, 'Data de entrada obrigatória.'),
  urgencia: z.string().min(1, 'Selecione a urgência.'),
  violacao: z.array(z.string()).min(1, 'Selecione ao menos uma violação.'),
  categoria: z.string().min(1, 'Selecione a categoria (Público-alvo).'),
  orgaoDemandante: z.string().min(2, 'Informe o órgão demandante.'),
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA'], {
    errorMap: () => ({ message: "Selecione a origem do caso." })
  }),

  // Agente: Pode vir vazio inicialmente se não distribuído
  agenteAcolhidaId: z.string().uuid().optional().or(z.literal('')),

  // Campos Opcionais / Strings vazias permitidas
  numeroSei: z.string().optional(),
  linkSei: z.string().optional(), // Poderia usar .url() se quiser validar formato estrito
  observacoes: z.string().optional(),

  // Array obrigatório (inicia como [])
  beneficios: z.array(z.string()).default([]),
})

export type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

// --- OUTROS SCHEMAS (Mantidos do original) ---

export const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico deve ser mais detalhado.'),
  objetivos: z.string().min(10, 'Descreva os objetivos.'),
  estrategias: z.string().min(10, 'Descreva as estratégias.'),
  deadline: z.string().refine((val) => val !== '', 'Data de reavaliação obrigatória.'),
})

export const evolutionFormSchema = z.object({
  conteudo: z.string().min(5, 'A evolução deve ter pelo menos 5 caracteres.'),
})

export const closeCaseFormSchema = z.object({
  motivoDesligamento: z.string().min(1, 'Selecione um motivo de desligamento.'),
  destinoDesligamento: z.string().min(1, 'Selecione o destino do caso.'),
  parecerFinal: z.string().min(10, 'O parecer final deve ser detalhado.'),
})