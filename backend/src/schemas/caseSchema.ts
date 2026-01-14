import { z } from 'zod'

// Schema do Item de Contato (Múltiplos telefones)
const ContactItemSchema = z.object({
  numero: z.string()
    .min(8, "Número muito curto")
    .transform(val => val.replace(/\D/g, '')), // Limpa máscara (ex: (61) 9... -> 619...)
  tipo: z.enum(["Pessoal", "Residencial", "Trabalho", "Vizinho", "Parente", "Outro"])
    .default("Pessoal"),
  nome: z.string().nullish().transform(v => v || ''), // Garante string vazia se null
  observacao: z.string().nullish()
})

// Schema do Endereço Detalhado (Padrão DF + Geo)
const EnderecoSchema = z.object({
  logradouro: z.string().min(3, "Logradouro obrigatório"),
  complemento: z.string().nullish(),
  bairro: z.string().nullish(),
  cidade: z.string().default("Brasília"),
  uf: z.string().default("DF"),
  cep: z.string()
    .nullish()
    .transform(val => val ? val.replace(/\D/g, '') : ''), // Limpa máscara do CEP
  ra: z.string().min(1, "Selecione a Região Administrativa"),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
})

// Schema Principal de Criação
export const createCaseBodySchema = z.object({
  // Identificação
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  nomeSocial: z.string().nullish(),
  cpf: z.string()
    .min(11, 'CPF incompleto')
    .transform(val => val.replace(/\D/g, '')), // Garante apenas números no DB
  nascimento: z.coerce.date({ 
    required_error: "Data de nascimento é obrigatória",
    invalid_type_error: "Data inválida" 
  }),
  sexo: z.string().min(1, 'Selecione o sexo'),
  
  // Contatos e Endereço Estruturados
  contatos: z.array(ContactItemSchema).min(1, "Adicione pelo menos um contato"),
  endereco: EnderecoSchema,
  
  // Responsável Legal (Opcionais, mas tratados para null)
  responsavelLegal: z.string().nullish(),
  parentescoResponsavel: z.string().nullish(),

  // Dados Técnicos e Triagem
  urgencia: z.string().min(1, "Selecione a urgência"),
  violacao: z.array(z.string()).min(1, "Selecione ao menos uma violação"),
  categoria: z.string().min(1, "Selecione a categoria"),
  orgaoDemandante: z.string().min(2, "Informe o órgão demandante"),
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA']),
  dataEntrada: z.coerce.date().default(() => new Date()),
  
  // Relacionamentos
  agenteAcolhidaId: z.string().uuid().nullish(),
  
  // Administrativo e Benefícios
  numeroSei: z.string().nullish(),
  linkSei: z.string().nullish(),
  observacoes: z.string().nullish(),
  beneficios: z.array(z.string()).default([]),
})

/**
 * Schema de Atualização:
 * Permite atualizar campos parciais, mas mantém as validações 
 * de formato (como a limpeza de CPF) se o campo for enviado.
 */
export const updateCaseBodySchema = createCaseBodySchema.partial()

// Tipagens para o TypeScript
export type CreateCaseInput = z.infer<typeof createCaseBodySchema>
export type UpdateCaseInput = z.infer<typeof updateCaseBodySchema>
export type ContactItem = z.infer<typeof ContactItemSchema>