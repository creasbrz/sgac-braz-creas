// src/utils/error.ts
import axios from 'axios'

/**
 * Extrai uma mensagem de erro legível, suportando mensagens simples
 * e erros de validação estruturados (Zod) vindos do Backend.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Ocorreu um erro inesperado.',
): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data as any
    
    // 1. Se tiver erros de validação (Zod)
    if (data.errors && typeof data.errors === 'object') {
      // Ex: { titulo: ["Obrigatório"], data: ["Inválida"] }
      const messages = Object.values(data.errors).flat()
      if (messages.length > 0) {
        return messages[0] as string // Retorna o primeiro erro encontrado
      }
    }

    // 2. Se tiver mensagem direta
    return data.message || error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return defaultMessage
}