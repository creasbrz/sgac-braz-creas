// frontend/src/components/layout/Header.tsx
import { useLocation, Link } from "react-router-dom"
import { LogOut, Eye, EyeOff, ChevronDown, User } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./MobileSidebar"
import { NotificationBell } from "./NotificationBell"
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog"
import { usePrivacy } from "@/contexts/PrivacyContext"
import { ROUTE_PATHS } from "@/constants/app-routes" 

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Mapeamento de Rotas para Labels Amigáveis
const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Painel Gerencial',
  'workspace': 'Minha Mesa',
  'cases': 'Prontuários',
  'waiting': 'Fila de Espera',
  'closed': 'Arquivo',
  'agenda': 'Agenda',
  'groups': 'Grupos',
  'reports': 'Relatórios',
  'team': 'Equipe',
  'users': 'Usuários',
  'audit': 'Auditoria',
  'analytics': 'Indicadores'
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  // --- LÓGICA DE BREADCRUMBS ---
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const displaySegments = pathSegments.filter(s => s !== 'app')

  // Lógica de Iniciais (Garante 2 letras maiúsculas)
  const initials = user?.nome
    ? user.nome.split(' ').map((n:string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md transition-all">
      
      {/* Mobile Trigger */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* Navegação Estrutural (Breadcrumbs) */}
      <div className="hidden md:flex items-center min-w-0 flex-1">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-hidden text-sm text-muted-foreground">
            <BreadcrumbItem>
               <BreadcrumbLink asChild>
                 <Link to={ROUTE_PATHS.WORKSPACE} className="hover:text-primary transition-colors font-medium">Início</Link>
               </BreadcrumbLink>
            </BreadcrumbItem>
            
            {displaySegments.length > 0 && <BreadcrumbSeparator />}

            {displaySegments.map((segment, index) => {
               const isLast = index === displaySegments.length - 1
               
               // Verifica se é um UUID (v4)
               const isUUID = /^[0-9a-fA-F-]{36}$/.test(segment);
               const displayName = isUUID 
                 ? 'Detalhes' 
                 : (ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1));

               const href = `/app/${displaySegments.slice(0, index + 1).join('/')}`

               return (
                 <div key={href} className="flex items-center whitespace-nowrap">
                   {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                   <BreadcrumbItem>
                     {isLast ? (
                       <BreadcrumbPage className="font-semibold text-foreground truncate max-w-50 block">{displayName}</BreadcrumbPage>
                     ) : (
                       <BreadcrumbLink asChild>
                         <Link to={href} className="hover:text-primary transition-colors">{displayName}</Link>
                       </BreadcrumbLink>
                     )}
                   </BreadcrumbItem>
                 </div>
               )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Área de Ações do Usuário (Direita) */}
      <div className="ml-auto flex items-center gap-3 md:gap-4 shrink-0">
        
        {/* Toolbar de Ferramentas */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/20 p-1 pr-2 shadow-sm">
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePrivacyMode}
                  className={`
                    h-8 w-8 rounded-full transition-all duration-300
                    ${isPrivacyMode 
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" 
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                    }
                  `}
                >
                  {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                 {isPrivacyMode ? "Desativar Modo Privacidade" : "Ativar Modo Privacidade"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-4 w-px bg-border mx-1" />

          <NotificationBell />
          <ThemeToggle />
        </div>

        {/* Menu de Perfil */}
        <div className="border-l border-border pl-3 ml-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-full md:w-auto justify-start md:justify-center px-2 rounded-full md:rounded-lg hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all gap-2"
              >
                 <Avatar className="h-9 w-9 border ring-2 ring-background transition-shadow group-hover:ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs tracking-wider">
                      {initials}
                    </AvatarFallback>
                 </Avatar>
                 
                 <div className="hidden md:flex flex-col items-start text-left gap-0.5">
                    <span className="text-sm font-semibold leading-none max-w-32 truncate">
                      {user?.nome?.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {user?.cargo?.replace(/_/g, ' ')}
                    </span>
                 </div>
                 <ChevronDown className="h-3 w-3 text-muted-foreground/50 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-64 p-1" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3 bg-muted/10 mb-1 rounded-t-md">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">{user?.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground break-all opacity-80 font-mono">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                 <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Meu Perfil</span>
                 </DropdownMenuItem>
                 
                 {/* Item Customizado para o Dialog dentro do Menu */}
                 <div className="relative flex cursor-pointer select-none items-center rounded-sm text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full py-0.5">
                    <ChangePasswordDialog /> 
                 </div>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={logout} 
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair da Conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}