// frontend/src/utils/date.ts
import { parseISO, isValid, format, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Combina uma string de data (YYYY-MM-DD) e hora (HH:mm) em um ISO String completo.
 * Útil para enviar dados de agendamento para o backend.
 * * @param date String no formato YYYY-MM-DD
 * @param time String no formato HH:mm
 */
export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return ''
  
  const [hours, minutes] = time.split(':').map(Number)
  
  // Adiciona 'T00:00:00' para garantir que o navegador interprete como data local
  // antes de ajustar o horário específico.
  const d = new Date(`${date}T00:00:00`)
  
  if (!isValid(d)) return ''

  d.setHours(hours, minutes, 0, 0)
  
  return d.toISOString()
}

/**
 * Wrapper seguro para parseISO que evita erros em datas inválidas/nulas.
 */
export function safeParseISO(dateString?: string | null): Date | null {
  if (!dateString) return null
  const d = parseISO(dateString)
  return isValid(d) ? d : null
}

/**
 * Formata data para exibição padrão brasileira (dd/MM/yyyy).
 * Retorna '-' se a data for inválida.
 */
export function formatDisplayDate(dateString?: string | null): string {
  const date = safeParseISO(dateString)
  if (!date) return '-'
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Formata data para chave de agrupamento (YYYY-MM-DD).
 * Útil para componentes de calendário ou mapas.
 */
export function formatDateKey(dateString: string): string {
  const date = safeParseISO(dateString)
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

/**
 * Calcula a idade com base na data de nascimento.
 * Retorna null se a data for inválida.
 */
export function calculateAge(birthDateString?: string | null): number | null {
  const birthDate = safeParseISO(birthDateString)
  if (!birthDate) return null
  
  return differenceInYears(new Date(), birthDate)
}