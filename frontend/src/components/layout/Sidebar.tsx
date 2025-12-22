// frontend/src/components/layout/Sidebar.tsx
import { memo, useMemo, useState } from "react"
import { NavLink } from "react-router-dom"
import { Plus, ChevronLeft, ChevronRight, PanelLeft } from "lucide-react"
import { clsx } from "clsx"

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { ROUTES } from "@/constants/routes"
import { GdfLogo } from "./GdfLogo"
import { Button } from "@/components/ui/button"
import { navLinks } from "@/constants/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// --- TYPES (Para acabar com o 'any') ---
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
}

interface SidebarLinkProps extends NavItem {
  collapsed: boolean
}

// --- COMPONENTES ---

const SidebarSection = ({ title, links, collapsed }: SidebarSectionProps) => {
  if (links.length === 0) return null

  return (
    <div className={clsx("grid gap-1", collapsed && "place-items-center")}>
      {!collapsed && (
        <h4 className="mb-1 px-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider animate-in fade-in duration-300 whitespace-nowrap overflow-hidden">
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
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center rounded-md transition-all duration-200 group relative overflow-hidden font-medium",
          // Layout condicional
          collapsed 
            ? "justify-center w-10 h-10 p-0" 
            : "gap-3 px-3 py-2 w-full",
          // Estilo Ativo vs Inativo
          isActive
            ? "bg-primary/10 text-primary hover:bg-primary/15"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )
      }
    >
      <Icon className={clsx("flex-shrink-0 transition-all", collapsed ? "h-5 w-5" : "h-4 w-4")} />
      
      {!collapsed && (
        <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
    </NavLink>
  )

  // Se estiver recolhido, mostra Tooltip
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium ml-2 bg-slate-900 text-white border-0">
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
  
  // Estado de controle manual (true = recolhido)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // [PERFORMANCE] useMemo evita recalcular filtros a cada render
  const accessibleLinks = useMemo(() => {
    return user ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo)) : []
  }, [user])

  const groupedLinks = useMemo(() => ({
    Acompanhamento: accessibleLinks.filter((l) => l.section === "Acompanhamento"),
    Administração: accessibleLinks.filter((l) => l.section === "Administração"),
  }), [accessibleLinks])

  return (
    <aside 
      className={clsx(
        "hidden md:flex flex-col border-r bg-card h-screen sticky top-0 transition-all duration-300 ease-in-out z-20 shadow-sm",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      
      {/* HEADER LOGO */}
      <div className={clsx(
        "flex h-16 items-center border-b transition-all duration-300 overflow-hidden", 
        isCollapsed ? "justify-center px-0" : "px-6"
      )}>
        <NavLink
          to={user?.cargo === "Gerente" ? ROUTES.DASHBOARD : ROUTES.CASES}
          className="flex items-center gap-2 font-bold text-lg tracking-tight whitespace-nowrap text-primary"
        >
          <GdfLogo className="h-7 w-7 flex-shrink-0" />
          <span className={clsx("transition-all duration-300", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 ml-1")}>
            SGAC
          </span>
        </NavLink>
      </div>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide space-y-8">
        
        {/* AÇÃO PRINCIPAL (NOVO CASO) */}
        <div className={clsx("flex", isCollapsed ? "justify-center" : "px-0")}>
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={openNewCaseModal} 
                    size="icon" 
                    className="h-10 w-10 bg-primary shadow-md hover:scale-105 transition-all rounded-xl"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold">Novo Caso</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={openNewCaseModal} className="w-full shadow-md font-semibold" size="default">
              <Plus className="mr-2 h-4 w-4" /> Novo Caso
            </Button>
          )}
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="grid gap-6">
          <SidebarSection title="Gestão" links={groupedLinks.Acompanhamento} collapsed={isCollapsed} />
          <SidebarSection title="Admin" links={groupedLinks.Administração} collapsed={isCollapsed} />
        </nav>
      </div>

      {/* FOOTER & TOGGLE */}
      <div className="border-t p-3 bg-muted/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx("w-full flex items-center text-muted-foreground hover:text-foreground", isCollapsed ? "justify-center px-0" : "justify-between px-2")}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {!isCollapsed && <span className="text-xs font-medium">Recolher Menu</span>}
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        
        {!isCollapsed && (
          <div className="mt-2 text-[10px] text-center text-muted-foreground/60">
            v{__APP_VERSION__ || '5.0'} • SEDES/DF
          </div>
        )}
      </div>
    </aside>
  )
})