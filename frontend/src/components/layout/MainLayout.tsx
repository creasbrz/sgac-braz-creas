// frontend/src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { NewCaseModal } from '../NewCaseModal'

export function MainLayout() {
  return (
    <div className="min-h-screen w-full flex bg-muted/40">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      {/* O Modal de Novo Caso agora é renderizado globalmente no layout */}
      <NewCaseModal />
    </div>
  )
}

