// frontend/src/components/layout/Sidebar.tsx
import { memo, useState } from "react"
import { NavLink } from "react-router-dom"
import { Plus } from "lucide-react"
import { clsx } from "clsx"

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { ROUTES } from "@/constants/routes"
import { GdfLogo } from "./GdfLogo"
import { Button } from "@/components/ui/button"
import { navLinks } from "@/constants/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export const Sidebar = memo(function Sidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()
  
  // Estado local para controle do Hover
  // Começa como 'true' (recolhido) por padrão para um visual mais limpo inicial
  const [isCollapsed, setIsCollapsed] = useState(true)

  const accessibleLinks = user
    ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo))
    : []

  const groupedLinks = {
    Acompanhamento: accessibleLinks.filter((l) => l.section === "Acompanhamento"),
    Administração: accessibleLinks.filter((l) => l.section === "Administração"),
  }

  return (
    <aside 
      // Eventos de Mouse para Expandir/Recolher
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      className={clsx(
        "hidden md:flex flex-col border-r bg-card min-h-screen transition-all duration-300 relative z-20 shadow-md",
        // Larguras definidas
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      
      {/* LOGO */}
      <div className={clsx(
        "flex h-16 items-center border-b transition-all duration-300 overflow-hidden", 
        isCollapsed ? "justify-center px-0" : "px-6"
      )}>
        <NavLink
          to={user?.cargo === "Gerente" ? ROUTES.DASHBOARD : ROUTES.CASES}
          className="flex items-center gap-2 font-bold text-lg tracking-tight whitespace-nowrap"
        >
          <GdfLogo className="h-6 w-6 text-primary flex-shrink-0" />
          <span className={clsx("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100 delay-100")}>
            SGAC-BRAZ
          </span>
        </NavLink>
      </div>

      {/* LINKS + SCROLL */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
        <nav className="grid gap-6">
          
          {/* BOTÃO NOVO CASO */}
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Botão quadrado centralizado */}
                  <Button 
                    onClick={openNewCaseModal} 
                    size="icon" 
                    className="h-10 w-10 mx-auto bg-primary shadow-sm rounded-md flex items-center justify-center transition-all hover:scale-105"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Novo Caso</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button onClick={openNewCaseModal} className="w-full shadow-sm animate-in fade-in zoom-in-95" size="lg">
              <Plus className="mr-2 h-4 w-4" /> Novo Caso
            </Button>
          )}

          {/* SEÇÕES */}
          {groupedLinks.Acompanhamento.length > 0 && (
            <SidebarSection title="ACOMPANHAMENTO" links={groupedLinks.Acompanhamento} collapsed={isCollapsed} />
          )}
          {groupedLinks.Administração.length > 0 && (
            <SidebarSection title="ADMINISTRAÇÃO" links={groupedLinks.Administração} collapsed={isCollapsed} />
          )}

        </nav>
      </div>

      {/* FOOTER (VERSÃO DO SISTEMA) */}
      <div className="border-t p-4 text-xs text-muted-foreground whitespace-nowrap overflow-hidden flex items-center justify-center h-14">
        {isCollapsed ? (
          <span className="font-semibold text-[10px]">v4.4</span>
        ) : (
          <span className="animate-in fade-in slide-in-from-left-2">v{__APP_VERSION__} • SEDES/DF</span>
        )}
      </div>
    </aside>
  )
})

function SidebarSection({ title, links, collapsed }: any) {
  return (
    <div className={clsx("grid gap-1", collapsed && "place-items-center")}>
      {!collapsed && (
        <h4 className="mb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide animate-in fade-in duration-300 whitespace-nowrap overflow-hidden text-ellipsis">
          {title}
        </h4>
      )}

      {links.map((link: any) => (
        <SidebarLink key={link.to} {...link} collapsed={collapsed} />
      ))}
    </div>
  )
}

function SidebarLink({ to, icon: Icon, label, collapsed }: any) {
  const content = (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center rounded-md transition-all duration-200 group relative overflow-hidden",
          // Mágica da centralização mantida:
          collapsed 
            ? "justify-center w-10 h-10 p-0 mx-auto" 
            : "gap-3 px-3 py-2.5 w-full",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className={clsx("flex-shrink-0 transition-all", collapsed ? "h-5 w-5" : "h-4 w-4")} />
      
      {!collapsed && (
        <span className="truncate animate-in fade-in slide-in-from-left-1 duration-200">
          {label}
        </span>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium z-50 ml-2">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}