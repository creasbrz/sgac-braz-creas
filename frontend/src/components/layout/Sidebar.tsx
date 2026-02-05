// frontend/src/components/layout/Sidebar.tsx
import { memo, useMemo, useState } from "react"
import { NavLink } from "react-router-dom"
import { 
  Plus, ChevronLeft, PanelLeft, ShieldCheck 
} from "lucide-react"
import { clsx } from "clsx"

import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext" // Caminho corrigido
import { ROUTES } from "@/constants/app-routes"
import { Button } from "@/components/ui/button"
import { NAV_LINKS, type NavLink as NavLinkType } from "@/constants/app-navigation" // Constantes atualizadas
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

// Versão da aplicação (Injetada pelo Vite define)
declare const __APP_VERSION__: string
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'

// --- TYPES ---
interface SidebarSectionProps {
  title: string
  links: NavLinkType[]
  collapsed: boolean
  isFirst?: boolean
}

interface SidebarLinkProps {
  item: NavLinkType
  collapsed: boolean
}

// --- SUB-COMPONENTES ---

const SidebarSection = ({ title, links, collapsed, isFirst }: SidebarSectionProps) => {
  if (links.length === 0) return null

  return (
    <div className={clsx("flex flex-col", collapsed ? "gap-2" : "gap-1")}>
      {/* Separador Sutil entre seções */}
      {!isFirst && !collapsed && (
        <div className="px-3 py-2">
           <Separator className="bg-border/60" />
        </div>
      )}

      {!collapsed && (
        <h4 className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest animate-in fade-in duration-300 whitespace-nowrap overflow-hidden select-none">
          {title}
        </h4>
      )}

      {links.map((link) => (
        <SidebarLink key={link.to} item={link} collapsed={collapsed} />
      ))}
    </div>
  )
}

const SidebarLink = ({ item, collapsed }: SidebarLinkProps) => {
  const Icon = item.icon

  const content = (
    <NavLink
      to={item.to}
      end={item.to === ROUTES.DASHBOARD}
      className={({ isActive }) =>
        clsx(
          "flex items-center rounded-md transition-all duration-200 group relative overflow-hidden text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          collapsed 
            ? "justify-center w-10 h-10 p-0 mx-auto" 
            : "gap-3 px-3 py-2 w-full",
          isActive
            ? "bg-primary/10 text-primary font-semibold shadow-sm" // Active State
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground" // Hover State
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicador Lateral de Ativo */}
          {!collapsed && isActive && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
          )}

          <Icon 
            aria-hidden="true"
            className={clsx(
              "shrink-0 transition-transform duration-200", 
              collapsed ? "h-5 w-5" : "h-4 w-4",
              isActive && "scale-105"
            )} 
          />
          
          {!collapsed && (
            <span className="truncate animate-in fade-in slide-in-from-left-1 duration-300">
              {item.label}
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
          <TooltipContent side="right" sideOffset={10} className="font-medium bg-popover text-popover-foreground border shadow-md z-50">
            {item.label}
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

  // Filtragem de Links baseada em Cargo
  const accessibleLinks = useMemo(() => {
    if (!user) return []
    return NAV_LINKS.filter((link) => {
       if (!link.allowedRoles) return true
       return link.allowedRoles.includes(user.cargo)
    })
  }, [user])

  // Agrupamento das seções
  const groupedLinks = useMemo(() => ({
    MeuTrabalho: accessibleLinks.filter((l) => l.section === "Meu Trabalho"),
    GestaoCasos: accessibleLinks.filter((l) => l.section === "Gestão de Casos"),
    Administracao: accessibleLinks.filter((l) => l.section === "Administração"),
  }), [accessibleLinks])

  if (!user) return null

  return (
    <aside 
      className={clsx(
        "hidden md:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-[width] duration-300 ease-in-out z-30 shadow-sm will-change-[width]",
        isCollapsed ? "w-20" : "w-64" // Tailwind v4 canonical sizes
      )}
    >
      
      {/* HEADER LOGO */}
      <div className={clsx(
        "flex h-16 items-center border-b border-border transition-all duration-300 overflow-hidden shrink-0", 
        isCollapsed ? "justify-center px-0" : "px-6"
      )}>
        <NavLink
          to={user?.cargo === "Gerente" ? ROUTES.DASHBOARD : ROUTES.WORKSPACE}
          className="flex items-center gap-2 font-extrabold text-lg tracking-tight whitespace-nowrap text-primary hover:opacity-90 transition-opacity"
        >
          <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20 shrink-0">
             <ShieldCheck className="h-6 w-6" />
          </div>
          
          <span className={clsx(
            "transition-all duration-300 origin-left text-foreground", 
            isCollapsed ? "opacity-0 w-0 scale-90 hidden" : "opacity-100 ml-1 scale-100"
          )}>
            SGAC<span className="text-muted-foreground font-normal ml-0.5 text-base">Braz</span>
          </span>
        </NavLink>
      </div>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        
        {/* AÇÃO PRINCIPAL (Novo Caso) */}
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
                <TooltipContent side="right" sideOffset={10} className="font-bold z-50">Novo Caso</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button 
              onClick={openNewCaseModal} 
              className="w-full shadow-sm font-bold tracking-wide bg-primary hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all active:scale-[0.98] h-10" 
              size="default"
            >
              <div className="bg-primary-foreground/20 p-0.5 rounded mr-2">
                 <Plus className="h-4 w-4" /> 
              </div>
              Novo Caso
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
      <div className="border-t border-border p-3 bg-muted/5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "w-full flex items-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors h-9", 
            isCollapsed ? "justify-center px-0" : "justify-between px-2"
          )}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {!isCollapsed && <span className="text-xs font-semibold">Recolher Menu</span>}
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        
        {!isCollapsed && (
          <div className="mt-3 text-[10px] text-center text-muted-foreground/40 font-mono tracking-widest uppercase">
            v{APP_VERSION} • SEDES/DF
          </div>
        )}
      </div>
    </aside>
  )
})