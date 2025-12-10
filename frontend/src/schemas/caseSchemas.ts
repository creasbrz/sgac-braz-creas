// frontend/src/schemas/caseSchemas.ts
import { z } from 'zod'

export const createCaseFormSchema = z.object({
  nomeCompleto: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().min(11, 'CPF inválido.'),
  // refine para garantir que não seja string vazia na hora de salvar
  nascimento: z.string().refine((val) => val.length > 0, 'Data de nascimento obrigatória.'),
  sexo: z.string().min(1, 'Selecione o sexo.'),
  telefone: z.string().min(10, 'Telefone inválido.'),
  endereco: z.string().min(5, 'Endereço muito curto.'),
  dataEntrada: z.string(),
  urgencia: z.string().min(1, 'Selecione a urgência.'),
  violacao: z.string().min(1, 'Selecione a violação.'),
  categoria: z.string().min(1, 'Selecione a categoria.'),
  orgaoDemandante: z.string().min(2, 'Informe o órgão demandante.'),
  
  origem: z.enum(['ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA']),
  
  agenteAcolhidaId: z.string().uuid('Selecione um agente válido.'),
  
  // [CORREÇÃO] Tipos estritos: aceitam string vazia, mas não null/undefined
  numeroSei: z.string(),
  linkSei: z.string(), // Validaremos URL no form se não for vazio, ou aceitamos string
  observacoes: z.string(),

  // [CORREÇÃO] Array obrigatório (inicia como [])
  beneficios: z.array(z.string()),
})

export type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

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