// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { NewCaseModal } from "../NewCaseModal"

export function MainLayout() {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      {/* GRID GERAL */}
      <div className="grid w-full min-h-screen md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">

        {/* SIDEBAR FIXA */}
        <Sidebar />

        {/* ÁREA PRINCIPAL */}
        <div className="flex flex-col">
          {/* HEADER FIXO */}
          <Header />

          {/* CONTEÚDO SCROLLÁVEL */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
            <div className="mx-auto max-w-6xl space-y-6">
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
