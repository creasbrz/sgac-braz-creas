// frontend/src/components/layout/Header.tsx
import { LogOut } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { MobileSidebar } from './MobileSidebar'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <MobileSidebar />
      <div className="w-full flex-1">
        {/* O botão "Novo Caso" foi movido para a Sidebar */}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{user?.nome}</p>
          <p className="text-xs text-muted-foreground">{user?.cargo}</p>
        </div>
        <Button onClick={logout} variant="destructive" size="icon" aria-label="Sair">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  )
}

