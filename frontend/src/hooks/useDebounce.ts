// frontend/src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

/**
 * Um hook customizado que atrasa a atualização de um valor.
 * É útil para evitar chamadas de API excessivas em campos de busca.
 * @param value O valor a ser "debounceado".
 * @param delay O tempo de atraso em milissegundos.
 * @returns O valor "debounceado".
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Limpa o timeout se o valor mudar antes do delay terminar
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
