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
  // [OTIMIZAÇÃO] Inicialização segura para evitar erro de hidratação
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Lê do storage apenas após a montagem do componente no cliente
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored) {
      setIsCollapsed(stored === "true")
    }
    setIsInitialized(true)
  }, [])

  // Salva no storage sempre que o estado mudar (após inicializado)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
    }
  }, [isCollapsed, isInitialized])

  const toggleSidebar = () => setIsCollapsed((prev) => !prev)

  // Evita renderizar children antes de ler a preferência do usuário (evita "pulo" visual)
  if (!isInitialized) {
      return null 
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