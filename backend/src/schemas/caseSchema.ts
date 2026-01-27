// backend/src/schemas/caseSchema.ts
import { z } from 'zod'

// --- Rol de Ocupações Padrão ---
export const OCUPACOES_ROL = [
  'Não trabalha',
  'Estudante',
  'Do lar',
  'Aposentado/Pensionista',
  'Autônomo/Informal',
  'Trabalhador Assalariado (CLT)',
  'Trabalhador Assalariado (Sem Carteira)',
  'BPC/LOAS',
  'Desempregado',
  'Outro'
] as const;

// --- Sub-Schemas Reutilizáveis ---

// Schema do Item de Contato
const ContactItemSchema = z.object({
  numero: z.string()
    .min(8, "Número muito curto")
    .transform(val => val.replace(/\D/g, '')),
  tipo: z.enum(["Pessoal", "Residencial", "Trabalho", "Vizinho", "Parente", "Outro"])
    .default("Pessoal"),
  nome: z.string().nullish().transform(v => v?.trim() || ''),
  observacao: z.string().nullish().transform(v => v?.trim())
})

// Schema do Endereço Detalhado
const EnderecoSchema = z.object({
  logradouro: z.string().min(3, "Logradouro obrigatório").transform(v => v.trim()),
  complemento: z.string().nullish().transform(v => v?.trim()),
  bairro: z.string().nullish().transform(v => v?.trim()),
  cidade: z.string().default("Brasília").transform(v => v.trim()),
  uf: z.string().default("DF").transform(v => v.trim()),
  cep: z.string()
    .nullish()
    .transform(val => val ? val.replace(/\D/g, '') : ''),
  ra: z.string().min(1, "Selecione a Região Administrativa"),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
})

// --- Schema Principal (Criação) ---

export const createCaseBodySchema = z.object({
  // 1. Identificação
  nomeCompleto: z.string().min(3, 'Nome muito curto').transform(v => v.trim()),
  nomeSocial: z.string().nullish().transform(v => v?.trim()),
  cpf: z.string()
    .min(11, 'CPF incompleto')
    .transform(val => val.replace(/\D/g, '')),
  nascimento: z.coerce.date({ 
    required_error: "Data de nascimento é obrigatória",
    invalid_type_error: "Data inválida" 
  }),
  sexo: z.string().min(1, 'Selecione o sexo'),

  // [NOVOS CAMPOS] Dados Socioeconômicos
  ocupacao: z.enum(OCUPACOES_ROL).or(z.string()).optional().nullable(),
  
  // Renda: Aceita número ou string, converte vírgula para ponto e garante número
  renda: z.preprocess((val) => {
    if (typeof val === 'string') {
      const clean = val.replace(',', '.').trim();
      return clean === '' ? undefined : parseFloat(clean);
    }
    return val;
  }, z.number().nonnegative().optional().nullable()),
  
  // 2. Contatos e Endereço
  contatos: z.array(ContactItemSchema).min(1, "Adicione pelo menos um contato").optional().default([]),
  endereco: EnderecoSchema,
  
  // 3. Responsável Legal
  responsavelLegal: z.string().nullish().transform(v => v?.trim()),
  parentescoResponsavel: z.string().nullish().transform(v => v?.trim()),

  // 4. Dados Técnicos e Triagem
  urgencia: z.string().min(1, "Selecione a urgência"),
  violacao: z.array(z.string()).min(1, "Selecione ao menos uma violação"),
  categoria: z.string().min(1, "Selecione a categoria"),
  orgaoDemandante: z.string().min(2, "Informe o órgão demandante").transform(v => v.trim()),
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA']),
  dataEntrada: z.coerce.date().default(() => new Date()),
  
  // 5. Relacionamentos
  agenteAcolhidaId: z.string().uuid().nullish(),
  
  // 6. Administrativo
  numeroSei: z.string().nullish().transform(v => v?.trim()),
  linkSei: z.string().nullish().transform(v => v?.trim()),
  observacoes: z.string().nullish().transform(v => v?.trim()),
  beneficios: z.array(z.string()).default([]),

  // [NOVOS CAMPOS] Controle Administrativo
  seiRespondido: z.boolean().optional().default(false),
  dataRespostaSei: z.coerce.date().nullish(),
  dataInicioPAEFI: z.coerce.date().nullish(),
})

// --- Schema de Atualização ---
export const updateCaseBodySchema = createCaseBodySchema.partial()

// --- Inferência de Tipos ---
export type CreateCaseInput = z.infer<typeof createCaseBodySchema>
export type UpdateCaseInput = z.infer<typeof updateCaseBodySchema>
export type ContactItem = z.infer<typeof ContactItemSchema>