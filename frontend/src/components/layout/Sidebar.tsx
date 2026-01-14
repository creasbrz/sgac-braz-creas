import { memo, useMemo, useState } from "react"
import { NavLink } from "react-router-dom"
import { 
  Plus, ChevronLeft, PanelLeft, LayoutDashboard 
} from "lucide-react"
import { clsx } from "clsx"

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { ROUTES } from "@/constants/app-routes"
import { GdfLogo } from "./GdfLogo"
import { Button } from "@/components/ui/button"
// [CORREÇÃO] Voltamos a importar sua lista original
import { navLinks } from "@/constants/app-navigation" 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

// 1. VERSÃO AUTOMÁTICA
const APP_VERSION = __APP_VERSION__

// --- TYPES ---
interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  allowedRoles: string[]
  section: string
}

interface SidebarSectionProps {
  title: string
  links: NavItem[]
  collapsed: boolean
  isFirst?: boolean
}

interface SidebarLinkProps extends NavItem {
  collapsed: boolean
}

// --- SUB-COMPONENTES ---

const SidebarSection = ({ title, links, collapsed, isFirst }: SidebarSectionProps) => {
  if (links.length === 0) return null

  return (
    <div className={clsx("flex flex-col", collapsed ? "gap-2" : "gap-1")}>
      {/* Separador Sutil entre seções (exceto a primeira) */}
      {!isFirst && !collapsed && (
        <div className="px-3 py-2">
           <Separator className="bg-border/40" />
        </div>
      )}

      {!collapsed && (
        <h4 className="px-4 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest animate-in fade-in duration-300 whitespace-nowrap overflow-hidden select-none">
          {title}
        </h4>
      )}

      {links.map((link) => (
        <SidebarLink key={link.to} {...link} collapsed={collapsed} />
      ))}
    </div>
  )
}

const SidebarLink = ({ to, icon: Icon, label, collapsed }: SidebarLinkProps) => {
  const content = (
    <NavLink
      to={to}
      end={to === ROUTES.DASHBOARD}
      className={({ isActive }) =>
        clsx(
          "flex items-center rounded-md transition-all duration-200 group relative overflow-hidden text-sm focus-visible:ring-2 focus-visible:ring-primary/30 outline-none",
          collapsed 
            ? "justify-center w-10 h-10 p-0 mx-auto" 
            : "gap-3 px-3 py-2 w-full",
          isActive
            ? "bg-primary/10 text-primary font-semibold shadow-sm" // Active State Forte
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground" // Hover Suave
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicador Lateral de Ativo (Barra Vertical) */}
          {!collapsed && isActive && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
          )}

          <Icon 
            aria-hidden="true"
            className={clsx(
              "flex-shrink-0 transition-transform duration-200", 
              collapsed ? "h-5 w-5" : "h-4 w-4",
              isActive && "scale-105"
            )} 
          />
          
          {!collapsed && (
            <span className="truncate animate-in fade-in slide-in-from-left-1 duration-300">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={5} className="font-medium bg-popover text-popover-foreground border shadow-md">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

// --- MAIN COMPONENT ---

export const Sidebar = memo(function Sidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()
  
  const [isCollapsed, setIsCollapsed] = useState(false)

  // [CORREÇÃO] Usando navLinks do seu arquivo original
  const accessibleLinks = useMemo(() => {
    // Adicionei validação 'link.allowedRoles' para evitar erro se estiver undefined
    return user ? navLinks.filter((link) => link.allowedRoles?.includes(user.cargo)) : []
  }, [user])

  // Agrupamento das 3 seções
  const groupedLinks = useMemo(() => ({
    MeuTrabalho: accessibleLinks.filter((l) => l.section === "Meu Trabalho"),
    GestaoCasos: accessibleLinks.filter((l) => l.section === "Gestão de Casos"),
    Administracao: accessibleLinks.filter((l) => l.section === "Administração"),
  }), [accessibleLinks])

  return (
    <aside 
      className={clsx(
        "hidden md:flex flex-col border-r bg-card h-screen sticky top-0 transition-[width] duration-300 ease-in-out z-20 shadow-sm will-change-[width]",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      
      {/* HEADER LOGO */}
      <div className={clsx(
        "flex h-16 items-center border-b transition-all duration-300 overflow-hidden", 
        isCollapsed ? "justify-center px-0" : "px-6"
      )}>
        <NavLink
          to={user?.cargo === "Gerente" ? ROUTES.DASHBOARD : ROUTES.WORKSPACE}
          className="flex items-center gap-2 font-extrabold text-lg tracking-tight whitespace-nowrap text-primary hover:opacity-80 transition-opacity"
        >
          {/* Se GdfLogo existir, usa ele. Senão, fallback visual */}
          {GdfLogo ? (
             <GdfLogo className="h-7 w-7 flex-shrink-0" />
          ) : (
             <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <LayoutDashboard className="h-5 w-5" />
             </div>
          )}
          
          <span className={clsx("transition-all duration-300 origin-left", isCollapsed ? "opacity-0 w-0 scale-90 hidden" : "opacity-100 ml-1 scale-100")}>
            SGAC
          </span>
        </NavLink>
      </div>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide space-y-6">
        
        {/* AÇÃO PRINCIPAL */}
        <div className={clsx("flex", isCollapsed ? "justify-center" : "px-0")}>
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={openNewCaseModal} 
                    size="icon" 
                    className="h-10 w-10 bg-primary hover:bg-primary/90 shadow-md hover:scale-105 transition-all rounded-xl focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5} className="font-bold">Novo Caso</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              onClick={openNewCaseModal} 
              className="w-full shadow-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all active:scale-[0.98]" 
              size="default"
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Caso
            </Button>
          )}
        </div>

        {/* NAVEGAÇÃO ORGANIZADA */}
        <nav className="flex flex-col gap-2">
          <SidebarSection title="Meu Trabalho" links={groupedLinks.MeuTrabalho} collapsed={isCollapsed} isFirst />
          <SidebarSection title="Gestão de Casos" links={groupedLinks.GestaoCasos} collapsed={isCollapsed} />
          <SidebarSection title="Administração" links={groupedLinks.Administracao} collapsed={isCollapsed} />
        </nav>
      </div>

      {/* FOOTER & TOGGLE */}
      <div className="border-t p-3 bg-muted/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "w-full flex items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors", 
            isCollapsed ? "justify-center px-0" : "justify-between px-2"
          )}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {!isCollapsed && <span className="text-xs font-semibold">Recolher</span>}
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        
        {!isCollapsed && (
          <div className="mt-3 text-[10px] text-center text-muted-foreground/40 font-mono tracking-widest">
            v{APP_VERSION} • SEDES/DF
          </div>
        )}
      </div>
    </aside>
  )
})