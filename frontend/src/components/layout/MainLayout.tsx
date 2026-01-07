// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../modals/NewCaseModal"
import { CommandMenu } from "../common/CommandMenu"

export function MainLayout() {
  return (
    // [1] Ajuste de Background para melhor contraste em Dark Mode
    <div className="flex h-screen w-full bg-muted/20 dark:bg-background overflow-hidden">
      
      <Sidebar />
      
      {/* [2] Transição otimizada (Performance) */}
      <div className="flex flex-col flex-1 h-full min-w-0 transition-[width,margin] duration-300 ease-in-out relative">
        <Header />
        
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-20 lg:pb-24 scroll-smooth focus:outline-none"
        >
          {/* [3] Animação suavizada e container centralizado */}
          <div className="mx-auto max-w-[1600px] h-full space-y-6 animate-in fade-in duration-300">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Componentes Globais (Overlay) */}
      <div className="z-50">
        <NewCaseModal />
        <CommandMenu />
      </div>
    </div>
  )
}