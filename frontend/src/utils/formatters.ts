// frontend/src/utils/formatters.ts
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma string de CPF para o formato 000.000.000-00.
 */
export const formatCPF = (cpf?: string | null) => {
  if (!cpf) return ''
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata uma string de telefone para (00) 00000-0000 ou (00) 0000-0000.
 */
export const formatPhone = (phone?: string | null) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

/**
 * Formata uma string de data para dd/MM/yyyy de forma segura, com fallback.
 */
export const formatDateSafe = (dateString?: string | null) => {
  if (!dateString) return ''
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

