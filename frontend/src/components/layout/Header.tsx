import { useLocation, Link } from "react-router-dom"
import { LogOut, Eye, EyeOff, ChevronDown, Lock } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./MobileSidebar"
import { NotificationBell } from "./NotificationBell"
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog"
import { usePrivacy } from "@/contexts/PrivacyContext"
// [CORREÇÃO] Caminho de importação ajustado para o novo arquivo
import { ROUTE_PATHS } from "@/constants/app-routes" 

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

// Mapeamento simples de nomes para exibição no Breadcrumb
// (Pode ser movido para um arquivo separado se crescer muito)
const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Painel Geral',
  'workspace': 'Minha Mesa',
  'cases': 'Casos',
  'waiting': 'Fila de Espera',
  'closed': 'Arquivo Morto',
  'agenda': 'Agenda',
  'groups': 'Grupos',
  'reports': 'Relatórios',
  'team': 'Gestão de Equipe',
  'users': 'Usuários',
  'audit': 'Auditoria',
  'analytics': 'Análise Avançada'
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  
  // Consumindo o contexto de privacidade
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy()

  // Lógica de Breadcrumbs Dinâmicos
  const pathSegments = location.pathname.split('/').filter(Boolean)
  // Remove o prefixo 'app' se existir, pois já é a raiz do layout autenticado
  const displaySegments = pathSegments.filter(s => s !== 'app')

  const initials = user?.nome
    ? user.nome.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur transition-all">
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* [REFATORADO] Breadcrumbs para navegação clara */}
      <div className="flex items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
               <BreadcrumbLink asChild>
                 <Link to={ROUTE_PATHS.WORKSPACE}>Início</Link>
               </BreadcrumbLink>
            </BreadcrumbItem>
            
            {displaySegments.length > 0 && <BreadcrumbSeparator />}

            {displaySegments.map((segment, index) => {
               const isLast = index === displaySegments.length - 1
               
               // Tenta pegar o nome amigável ou usa o próprio segmento formatado
               const isUUID = /^[0-9a-fA-F-]{36}$/.test(segment);
               const displayName = isUUID 
                 ? 'Detalhes' 
                 : (ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1));

               // Reconstrói o caminho relativo
               // Nota: Isso é simplificado. Em apps complexos, use matchRoutes do react-router
               const href = `/app/${displaySegments.slice(0, index + 1).join('/')}`

               return (
                 <div key={href} className="flex items-center">
                   {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                   <BreadcrumbItem>
                     {isLast ? (
                       <BreadcrumbPage className="font-semibold">{displayName}</BreadcrumbPage>
                     ) : (
                       <BreadcrumbLink asChild>
                         <Link to={href}>{displayName}</Link>
                       </BreadcrumbLink>
                     )}
                   </BreadcrumbItem>
                 </div>
               )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-4">
        
        <div className="hidden sm:flex items-center gap-1 rounded-full border bg-muted/40 p-1 pr-2">
          
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
            title={isPrivacyMode ? "Modo Privacidade Ativo" : "Ativar Modo Privacidade"}
          >
            {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <NotificationBell />
          <ThemeToggle />
        </div>

        <div className="border-l pl-4 ml-0 privacy-exempt">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                aria-label="Menu do usuário"
                className="relative h-10 w-full md:w-auto justify-start md:justify-center px-2 rounded-full md:rounded-lg hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border ring-1 ring-border/50 shadow-none">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-semibold leading-none max-w-[120px] truncate text-foreground/90">
                      {user?.nome}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">
                      {user?.cargo?.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground/50 hidden md:block" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-60" align="end" forceMount>
              <DropdownMenuLabel className="font-normal pb-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground break-all">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()} className="p-0 focus:bg-transparent">
                 <div className="w-full">
                    <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                        <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                        <ChangePasswordDialog /> 
                    </div>
                 </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer">
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