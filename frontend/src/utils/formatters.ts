// src/utils/formatters.ts
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata data ISO para DD/MM/AAAA de forma segura.
 * Retorna '-' se a data for inválida ou nula.
 */
export const formatDateSafe = (dateString?: string | Date | null, pattern = 'dd/MM/yyyy') => {
  if (!dateString) return '-'
  
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
  
  if (!isValid(date)) return '-'
  
  return format(date, pattern, { locale: ptBR })
}

export const formatCPF = (cpf?: string | null) => {
  if (!cpf) return ''
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf 
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatPhone = (phone?: string | null) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10) return phone
  if (cleaned.length === 11) { // Celular
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  // Fixo
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}