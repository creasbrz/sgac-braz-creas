// frontend/src/contexts/SidebarContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

const SIDEBAR_STORAGE_KEY = "@sgac-braz:sidebar-collapsed"

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (value: boolean) => void
  state: 'expanded' | 'collapsed' 
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  // [OTIMIZAÇÃO v1.1] Inicialização "Safe": Começa com padrão (false) para render rápido
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Efeito para ler do storage apenas após a montagem (Hydration Safe)
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored) {
      setIsCollapsed(stored === "true")
    }
    setIsInitialized(true)
  }, [])

  // Efeito para salvar mudanças
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
    }
  }, [isCollapsed, isInitialized])

  const toggleSidebar = () => setIsCollapsed((prev) => !prev)

  // Evita "flash" de conteúdo incorreto enquanto lê o storage
  // (Opcional: Pode renderizar children direto se preferir layout shift mínimo a bloqueio)
  if (!isInitialized) {
      return null // Ou um skeleton de layout
  }

  return (
    <SidebarContext.Provider 
      value={{ 
        isCollapsed, 
        toggleSidebar, 
        setCollapsed: setIsCollapsed,
        state: isCollapsed ? 'collapsed' : 'expanded'
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  
  return context
}