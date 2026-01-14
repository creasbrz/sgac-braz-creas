// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../modals/NewCaseModal"
import { CommandMenu } from "../common/CommandMenu"

export function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-muted/10 dark:bg-background overflow-hidden text-foreground">
      
      {/* [Acessibilidade] Link para pular navegação (aparece apenas no foco do teclado) */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md shadow-lg"
      >
        Pular para o conteúdo principal
      </a>

      {/* Barra Lateral Fixa/Flex */}
      <Sidebar />
      
      {/* Área Principal */}
      <div className="flex flex-col flex-1 h-full min-w-0 relative transition-all duration-300">
        <Header />
        
        {/* Conteúdo com Scroll Independente */}
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth focus:outline-none scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
        >
          {/* Container Centralizado e Responsivo */}
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Componentes Globais (Portals) */}
      <NewCaseModal />
      <CommandMenu />
    </div>
  )
}