// frontend/src/components/layout/Header.tsx
import { LogOut, Slash } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./MobileSidebar"
import { useLocation } from "react-router-dom"
import { NotificationBell } from "./NotificationBell"

// Mapa de nomes amigáveis para as rotas
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Painel Principal',
  '/dashboard/cases': 'Gestão de Casos',
  '/dashboard/cases/closed': 'Arquivo Morto (Finalizados)',
  '/dashboard/agenda': 'Minha Agenda',
  '/dashboard/reports': 'Relatórios Gerenciais',
  '/dashboard/team-overview': 'Visão de Equipe',
  '/dashboard/users': 'Controle de Usuários',
  '/dashboard/audit': 'Auditoria do Sistema'
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  // Lógica para determinar o título da página
  let pageTitle = PAGE_TITLES[pathname]

  // Se não achou no mapa exato, verifica padrões dinâmicos
  if (!pageTitle) {
    if (pathname.includes('/dashboard/cases/')) {
      pageTitle = 'Prontuário Eletrônico' // Para a tela de detalhes
    } else {
      // Fallback genérico: pega o último pedaço da URL
      const parts = pathname.split('/')
      const lastPart = parts[parts.length - 1]
      pageTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur">
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* BREADCRUMB (Caminho) */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline-block font-medium text-foreground/80">
          SGAC
        </span>
        <Slash className="hidden sm:inline-block h-4 w-4 text-muted-foreground/40" />
        <span className="font-semibold text-primary">
          {pageTitle}
        </span>
      </div>

      {/* AÇÕES */}
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        
        <NotificationBell />
        <ThemeToggle />

        <div className="hidden md:flex flex-col items-end border-l pl-4 ml-2">
          <span className="text-sm font-medium leading-none">
            {user?.nome}
          </span>
          <span className="text-xs text-muted-foreground uppercase">
            {user?.cargo}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}