// frontend/src/contexts/PrivacyContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

interface PrivacyContextType {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
}

const PrivacyContext = createContext({} as PrivacyContextType)

// Hook para facilitar o uso
export const usePrivacy = () => useContext(PrivacyContext)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Começa desativado por padrão
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)

  const togglePrivacyMode = () => setIsPrivacyMode((prev) => !prev)

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  )
}