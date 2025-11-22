// frontend/src/hooks/useModal.ts
import { useContext } from 'react'
import { ModalContext } from '@/contexts/ModalContext'

/**
 * Hook customizado para acessar o contexto de modais.
 */
export function useModal() {
  const context = useContext(ModalContext)

  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }

  return context
}
