// frontend/src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query'

// Cria uma instância única (singleton) do QueryClient
// Esta instância gerenciará todo o cache de dados,
// novas buscas (refetching), etc., para a aplicação.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})