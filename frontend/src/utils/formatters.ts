// frontend/src/utils/formatters.ts
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma string de CPF para o formato 000.000.000-00.
 */
export const formatCPF = (cpf?: string | null) => {
  if (!cpf) return ''

  const cleaned = cpf.replace(/\D/g, '')

  if (cleaned.length !== 11) return cpf // devolve como veio se inválido

  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata uma string de telefone para (00) 00000-0000 ou (00) 0000-0000.
 */
export const formatPhone = (phone?: string | null) => {
  if (!phone) return ''

  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length < 10) return phone // telefone muito curto -> devolve original

  if (cleaned.length === 11) {
    // Celular
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  // Telefone fixo
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

/**
 * Formata uma data no formato dd/MM/yyyy de forma segura.
 */
export const formatDateSafe = (dateInput?: string | null | Date) => {
  if (!dateInput) return 'N/A'

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

  if (isNaN(date.getTime())) return 'Data inválida'

  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}