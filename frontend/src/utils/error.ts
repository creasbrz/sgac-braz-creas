// frontend/src/utils/error.ts
import { isAxiosError } from 'axios'

/**
 * Extrai uma mensagem de erro amigável de qualquer tipo de objeto de erro.
 * Lida com falhas de rede, timeouts, erros de validação do backend e exceções nativas.
 * * @param error O objeto de erro capturado no bloco catch.
 * @param defaultMessage Mensagem de fallback caso não seja possível extrair nada.
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage = 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
): string {
  // 1. Erros do Axios (Requisições HTTP)
  if (isAxiosError(error)) {
    // Caso A: Sem resposta do servidor (Network Error, CORS, Backend Offline)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'A conexão excedeu o tempo limite. Tente novamente.'
      }
      return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
    }

    // Caso B: O servidor respondeu com um erro (4xx, 5xx)
    // Tenta extrair a mensagem de diferentes formatos comuns de API
    const data = error.response.data as any

    // Formato 1: { message: "..." } (Mais comum)
    if (data?.message && typeof data.message === 'string') {
      return data.message
    }

    // Formato 2: { error: "..." }
    if (data?.error && typeof data.error === 'string') {
      return data.error
    }

    // Formato 3: { errors: ["...", "..."] } (Arrays de validação)
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      // Retorna o primeiro erro da lista ou junta eles
      return typeof data.errors[0] === 'string' 
        ? data.errors[0] 
        : 'Erro de validação nos dados enviados.'
    }

    // Formato 4: O body é uma string pura
    if (typeof data === 'string' && data.length > 0) {
      return data
    }

    // Fallback do Axios: Status HTTP (Ex: "Erro 500: Internal Server Error")
    return `Erro ${error.response.status}: ${error.response.statusText}`
  }

  // 2. Erros Nativos do JavaScript (throw new Error(...))
  if (error instanceof Error) {
    return error.message
  }

  // 3. Strings lançadas manualmente (throw "Mensagem")
  if (typeof error === 'string') {
    return error
  }

  // 4. Objetos genéricos com propriedade message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message)
  }

  return defaultMessage
}