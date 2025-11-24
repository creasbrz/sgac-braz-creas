// frontend/src/contexts/SidebarContext.tsx
import { createContext, useContext, useState, ReactNode } from "react"

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Inicia lendo do localStorage ou padrão false (aberto)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem("sgac-sidebar-collapsed")
    return stored === "true"
  })

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const newState = !prev
      localStorage.setItem("sgac-sidebar-collapsed", String(newState))
      return newState
    })
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}