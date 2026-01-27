// frontend/src/utils/formatters.ts
import { format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma string de CPF para o formato 000.000.000-00.
 */
export const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return ''

  const cleaned = cpf.replace(/\D/g, '')

  if (cleaned.length !== 11) return cpf // Retorna original se tamanho incorreto

  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata uma string de telefone para (00) 00000-0000 ou (00) 0000-0000.
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return ''

  const cleaned = phone.replace(/\D/g, '')

  // Celular (11 dígitos)
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  // Fixo (10 dígitos)
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }

  return phone // Retorna original se não bater os tamanhos
}

/**
 * Formata Processo SEI suportando os dois padrões do GDF:
 * 1. Padrão Antigo/Curto (19 dígitos): 00054-00160500/2025-77
 * 2. Padrão Novo/Longo (21 dígitos): 19.04.1237.0168706/2025-77
 */
export const formatProcessoSei = (value: string | null | undefined): string => {
  if (!value) return ''
  
  const clean = value.replace(/\D/g, '')

  // Modelo 1: 5-8/4-2
  if (clean.length === 19) {
    return clean.replace(/^(\d{5})(\d{8})(\d{4})(\d{2})$/, '$1-$2/$3-$4')
  }

  // Modelo 2: 2.2.4.7/4-2
  if (clean.length === 21) {
    return clean.replace(/^(\d{2})(\d{2})(\d{4})(\d{7})(\d{4})(\d{2})$/, '$1.$2.$3.$4/$5-$6')
  }

  return value
}

/**
 * Formata valor numérico para moeda BRL (R$ 1.200,00).
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'R$ 0,00'
  
  const numberValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numberValue)) return 'R$ 0,00'

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numberValue)
}

/**
 * Formata uma data no formato dd/MM/yyyy de forma segura.
 */
export const formatDateSafe = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-'

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

  if (!isValid(date)) return '-'

  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}