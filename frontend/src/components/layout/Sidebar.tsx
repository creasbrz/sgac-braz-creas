// frontend/src/components/layout/Sidebar.tsx
import { memo } from "react"
import { NavLink } from "react-router-dom"
import { Plus } from "lucide-react"
import { clsx } from "clsx"

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { ROUTES } from "@/constants/routes"
import { GdfLogo } from "./GdfLogo"
import { Button } from "@/components/ui/button"
import { navLinks } from "@/constants/navigation"

export const Sidebar = memo(function Sidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()

  const accessibleLinks = user
    ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo))
    : []

  const groupedLinks = {
    Acompanhamento: accessibleLinks.filter((l) => l.section === "Acompanhamento"),
    Administração: accessibleLinks.filter((l) => l.section === "Administração"),
  }

  return (
    <aside className="hidden md:flex flex-col border-r bg-card min-h-screen w-[260px]">
      
      {/* LOGO */}
      <div className="flex h-16 items-center border-b px-6">
        <NavLink
          to={user?.cargo === "Gerente" ? ROUTES.DASHBOARD : ROUTES.CASES}
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <GdfLogo className="h-6 w-6 text-primary" />
          <span>SGAC-BRAZ</span>
        </NavLink>
      </div>

      {/* LINKS + SCROLL */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="grid gap-8">
          
          {/* BOTÃO NOVO CASO */}
          <Button onClick={openNewCaseModal} className="w-full shadow-sm" size="lg">
            <Plus className="mr-2 h-4 w-4" /> Novo Caso
          </Button>

          {/* SEÇÕES */}
          {groupedLinks.Acompanhamento.length > 0 && (
            <SidebarSection title="ACOMPANHAMENTO" links={groupedLinks.Acompanhamento} />
          )}
          {groupedLinks.Administração.length > 0 && (
            <SidebarSection title="ADMINISTRAÇÃO" links={groupedLinks.Administração} />
          )}

        </nav>
      </div>

      {/* FOOTER */}
      <div className="border-t p-4 text-center text-xs text-muted-foreground">
        v2.0.0 • SEDES/DF
      </div>
    </aside>
  )
})

function SidebarSection({ title, links }: any) {
  return (
    <div className="grid gap-2">
      <h4 className="mb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>

      {links.map((link: any) => (
        <SidebarLink key={link.to} {...link} />
      ))}
    </div>
  )
}

function SidebarLink({ to, icon: Icon, label }: any) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}