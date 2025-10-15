// frontend/src/schemas/caseSchemas.ts
import { z } from 'zod'

// --- Funções de Validação Customizadas ---
function validaCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '')
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  let add = 0
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i)
  let rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(9))) return false
  add = 0
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i)
  rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(10))) return false
  return true
}

const requiredFieldMessage = 'Este campo é obrigatório.'

// --- Schemas de Formulário ---
export const createCaseFormSchema = z.object({
  nomeCompleto: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  cpf: z.string().refine(validaCPF, { message: 'CPF inválido.' }),
  nascimento: z.string().min(1, requiredFieldMessage),
  sexo: z.string().min(1, requiredFieldMessage),
  telefone: z.string().refine((tel) => tel.replace(/\D/g, '').length >= 10, {
    message: 'Telefone inválido.',
  }),
  endereco: z.string().min(5, 'O endereço é obrigatório.'),
  dataEntrada: z.string(),
  urgencia: z.string().min(1, requiredFieldMessage),
  violacao: z.string().min(1, requiredFieldMessage),
  categoria: z.string().min(1, requiredFieldMessage),
  orgaoDemandante: z.string().min(1, requiredFieldMessage),
  numeroSei: z.string().optional(),
  linkSei: z.string().url('URL inválida.').optional().or(z.literal('')),
  agenteAcolhidaId: z.string().min(1, 'É obrigatório selecionar um agente.'),
  observacoes: z.string().optional(),
})

export const evolutionFormSchema = z.object({
  conteudo: z.string().min(10, 'A evolução deve ter no mínimo 10 caracteres.'),
})

export const pafFormSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico é muito curto.'),
  objetivos: z.string().min(10, 'Defina objetivos claros.'),
  estrategias: z.string().min(10, 'Descreva as estratégias.'),
  prazos: z.string().min(5, 'Defina os prazos.'),
})

export const closeCaseFormSchema = z.object({
  parecerFinal: z.string().min(10, 'O parecer final deve ter no mínimo 10 caracteres.'),
})