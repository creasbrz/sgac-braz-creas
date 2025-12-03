// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../NewCaseModal"

export function MainLayout() {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      {/* GRID FIXO: 260px para sidebar, restante para conteúdo */}
      <div className="grid w-full min-h-screen md:grid-cols-[260px_1fr]">

        {/* SIDEBAR FIXA */}
        <Sidebar />

        {/* ÁREA PRINCIPAL */}
        <div className="flex flex-col h-screen overflow-hidden">
          {/* HEADER FIXO */}
          <Header />

          {/* CONTEÚDO SCROLLÁVEL */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background/50">
            {/* [CORREÇÃO v3.2] Removido 'max-w-6xl mx-auto' */}
            {/* Agora usamos h-full e w-full para permitir que páginas como o Kanban usem todo o espaço */}
            <div className="h-full w-full space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* MODAL GLOBAL */}
      <NewCaseModal />
    </div>
  )
}