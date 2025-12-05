// frontend/src/utils/date.ts
import { parseISO, isValid, format } from 'date-fns'

/**
 * Combina uma string de data (YYYY-MM-DD) e hora (HH:mm) em um ISO String seguro.
 */
export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  
  // Cria a data garantindo que o horário seja zerado antes de setar
  const d = new Date(date + 'T00:00:00')
  d.setHours(hours, minutes, 0, 0)
  
  return d.toISOString()
}

/**
 * Wrapper seguro para parseISO que evita crash em datas inválidas
 */
export function safeParseISO(dateString: string): Date | null {
  if (!dateString) return null
  const d = parseISO(dateString)
  return isValid(d) ? d : null
}

/**
 * Formata data para chave de mapa/set (YYYY-MM-DD)
 */
export function formatDateKey(dateString: string): string {
  const date = safeParseISO(dateString)
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}