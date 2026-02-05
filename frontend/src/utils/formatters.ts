// frontend/src/utils/formatters.ts
import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Remove todos os caracteres não numéricos de uma string.
 */
export const stripNonNumeric = (value: string | null | undefined): string => {
  return value ? value.replace(/\D/g, '') : ''
}

/**
 * Formata CPF: 000.000.000-00
 */
export const formatCPF = (cpf: string | null | undefined): string => {
  const cleaned = stripNonNumeric(cpf)
  if (!cleaned) return ''
  
  if (cleaned.length !== 11) return cpf || ''
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CEP: 00000-000
 */
export const formatCEP = (cep: string | null | undefined): string => {
  const cleaned = stripNonNumeric(cep)
  if (!cleaned) return ''

  if (cleaned.length !== 8) return cep || ''

  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Formata Telefone (Fixo ou Celular)
 * (00) 0000-0000 ou (00) 00000-0000
 */
export const formatPhone = (phone: string | null | undefined): string => {
  const cleaned = stripNonNumeric(phone)
  if (!cleaned) return ''

  // Celular (11 dígitos)
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  // Fixo (10 dígitos)
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }

  return phone || ''
}

/**
 * Formata Processo SEI (Padrões GDF)
 * Padrão Antigo: 00054-00160500/2025-77
 * Padrão Novo: 19.04.1237.0168706/2025-77
 */
export const formatProcessoSei = (value: string | null | undefined): string => {
  const clean = stripNonNumeric(value)
  if (!clean) return ''

  // Modelo 1: 5-8/4-2 (19 dígitos)
  if (clean.length === 19) {
    return clean.replace(/^(\d{5})(\d{8})(\d{4})(\d{2})$/, '$1-$2/$3-$4')
  }

  // Modelo 2: 2.2.4.7/4-2 (21 dígitos)
  if (clean.length === 21) {
    return clean.replace(/^(\d{2})(\d{2})(\d{4})(\d{7})(\d{4})(\d{2})$/, '$1.$2.$3.$4/$5-$6')
  }

  return value || ''
}

/**
 * Formata valor monetário para BRL (R$ 1.200,00)
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
 * Formata data ISO para padrão brasileiro (dd/MM/yyyy).
 * Usa parseISO para evitar problemas de timezone em datas puras (YYYY-MM-DD).
 */
export const formatDateSafe = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '-'

  let date: Date

  if (typeof dateInput === 'string') {
    // Se for string ISO completa ou YYYY-MM-DD, parseISO é mais seguro que new Date()
    date = parseISO(dateInput)
  } else {
    date = dateInput
  }

  if (!isValid(date)) return '-'

  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Normaliza nomes para "Title Case" (Primeira Letra Maiúscula).
 * Converte: "JOAO DA SILVA" -> "Joao da Silva"
 * Ignora preposições comuns (de, da, do, dos, e).
 */
export const formatName = (name: string | null | undefined): string => {
  if (!name) return ''

  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e']
  
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}