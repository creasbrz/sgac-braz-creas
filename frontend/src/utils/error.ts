// frontend/src/utils/error.ts
import axios from 'axios'

/**
 * Extrai uma mensagem de erro legível de um objeto de erro desconhecido.
 * @param error O erro capturado no bloco catch.
 * @param defaultMessage Uma mensagem padrão para usar como fallback.
 * @returns A mensagem de erro extraída.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Ocorreu um erro inesperado.',
): string {
  if (axios.isAxiosError(error) && error.response) {
    return error.response.data?.message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return defaultMessage
}

