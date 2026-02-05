// frontend/src/contexts/ModalContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

// --- TYPES ---
interface ModalContextType {
  isNewCaseModalOpen: boolean
  openNewCaseModal: () => void
  closeNewCaseModal: () => void
}

// --- CONTEXT ---
// Iniciamos como undefined para forçar o uso dentro do Provider
const ModalContext = createContext<ModalContextType | undefined>(undefined)

// --- PROVIDER ---
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

// --- HOOK PERSONALIZADO (Esta é a parte que estava faltando/dando erro) ---
export function useModal() {
  const context = useContext(ModalContext)
  
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  
  return context
}