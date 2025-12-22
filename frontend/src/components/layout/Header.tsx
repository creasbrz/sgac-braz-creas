// frontend/src/components/layout/Header.tsx
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { LogOut, Slash, Eye, EyeOff, ChevronDown } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./MobileSidebar"
import { NotificationBell } from "./NotificationBell"
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Mapa de nomes amigáveis para as rotas
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Painel Principal',
  '/dashboard/cases': 'Gestão de Casos',
  '/dashboard/cases/closed': 'Arquivo Morto (Finalizados)',
  '/dashboard/agenda': 'Minha Agenda',
  '/dashboard/reports': 'Relatórios Gerenciais',
  '/dashboard/team-overview': 'Visão de Equipe',
  '/dashboard/users': 'Controle de Usuários',
  '/dashboard/audit': 'Auditoria do Sistema',
  '/dashboard/groups': 'Grupos e Oficinas',
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const pathname = location.pathname
  
  const [privacyMode, setPrivacyMode] = useState(false)

  useEffect(() => {
    if (privacyMode) {
      document.body.classList.add('privacy-mode')
    } else {
      document.body.classList.remove('privacy-mode')
    }
  }, [privacyMode])

  // Lógica para determinar o título da página
  let pageTitle = PAGE_TITLES[pathname]

  if (!pageTitle) {
    if (pathname.includes('/dashboard/cases/')) {
      pageTitle = 'Prontuário Eletrônico' 
    } else {
      const parts = pathname.split('/')
      const lastPart = parts[parts.length - 1]
      pageTitle = lastPart ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1) : 'SGAC'
    }
  }

  // Iniciais para o Avatar
  const initials = user?.nome
    ? user.nome.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur transition-all">
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
         <span className="hidden sm:inline-block font-medium text-foreground/80">
          SGAC
        </span>
        <Slash className="hidden sm:inline-block h-4 w-4 text-muted-foreground/40" />
        <span className="font-semibold text-primary animate-in fade-in slide-in-from-left-2">
          {pageTitle}
        </span>
      </div>

      {/* AÇÕES */}
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPrivacyMode(!privacyMode)}
          className={privacyMode ? "text-primary bg-primary/10" : "text-muted-foreground"}
          title={privacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade (Ocultar dados)"}
        >
          {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </Button>

        <NotificationBell />
        <ThemeToggle />

        {/* ÁREA DO USUÁRIO (DROPDOWN) */}
        <div className="border-l pl-4 ml-2 privacy-exempt">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-full md:w-auto justify-start md:justify-center px-2 hover:bg-muted rounded-full md:rounded-md transition-all">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-medium leading-none max-w-[120px] truncate">
                      {user?.nome}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {user?.cargo?.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* O componente ChangePasswordDialog já renderiza um botão trigger. 
                  Usamos asChild para ele se comportar bem dentro do menu. 
                  PreventDefault no onSelect evita que o menu feche abruptamente antes do modal abrir. */}
              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                 <div className="w-full cursor-pointer p-0">
                    <ChangePasswordDialog />
                 </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair do Sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}