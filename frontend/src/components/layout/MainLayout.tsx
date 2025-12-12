// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../NewCaseModal"

export function MainLayout() {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      {/* [MUDANÇA IMPORTANTE]
        Trocamos 'grid md:grid-cols-[260px_1fr]' por 'flex'.
        Assim, a Sidebar controla a sua própria largura e o conteúdo principal
        (div abaixo) ajusta-se automaticamente (flex-1).
      */}
      <div className="flex w-full min-h-screen">

        {/* SIDEBAR (Largura controlada internamente pelo componente) */}
        <Sidebar />

        {/* ÁREA PRINCIPAL */}
        <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0 transition-all duration-300">
          {/* HEADER FIXO */}
          <Header />

          {/* CONTEÚDO SCROLLÁVEL */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background/50">
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