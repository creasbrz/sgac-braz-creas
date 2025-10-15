// frontend/src/contexts/ModalContext.tsx
import { createContext, useState, type ReactNode } from 'react'

interface ModalContextType {
  isNewCaseModalOpen: boolean
  openNewCaseModal: () => void
  closeNewCaseModal: () => void
}

export const ModalContext = createContext({} as ModalContextType)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false)

  const openNewCaseModal = () => setIsNewCaseModalOpen(true)
  const closeNewCaseModal = () => setIsNewCaseModalOpen(false)

  return (
    <ModalContext.Provider
      value={{
        isNewCaseModalOpen,
        openNewCaseModal,
        closeNewCaseModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

