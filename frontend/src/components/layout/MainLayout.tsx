// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../modals/NewCaseModal"
import { CommandMenu } from "../common/CommandMenu"
import { cn } from "@/lib/utils"

export function MainLayout() {
  return (
    // Container Principal: Ocupa toda a tela, sem scroll no body
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground antialiased font-sans selection:bg-primary/20">
      
      {/* [Acessibilidade] Skip Link aprimorado */}
      <a 
        href="#main-content" 
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-4 focus:left-4",
          "px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg shadow-xl",
          "transition-transform duration-200 focus:translate-y-0 -translate-y-12"
        )}
      >
        Pular para o conteúdo principal
      </a>

      {/* Barra Lateral (Controla sua própria largura/colapso) */}
      <Sidebar />
      
      {/* Coluna da Direita (Header + Conteúdo) */}
      <div className="flex flex-col flex-1 h-full min-w-0 relative transition-all duration-300 bg-muted/20 dark:bg-background/50">
        
        {/* Cabeçalho Fixo no topo da coluna */}
        <Header />
        
        {/* Área de Scroll Principal */}
        <main 
          id="main-content"
          tabIndex={-1} // Permite foco programático para o skip link
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth focus:outline-none scrollbar-thin"
        >
          {/* Container Centralizado para limitar largura em telas ultrawide */}
          {/* max-w-400 equivale a 1600px no Tailwind v4 (400 * 4px) */}
          <div className="mx-auto w-full max-w-400 p-4 sm:p-6 lg:p-8 pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Camada de Modais e Menus Globais */}
      <NewCaseModal />
      <CommandMenu />
    </div>
  )
}