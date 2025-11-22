// frontend/src/components/layout/MobileSidebar.tsx
import { useState } from "react"
import { NavLink } from "react-router-dom"
import { Menu, Plus } from "lucide-react"
import { clsx } from "clsx"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { navLinks } from "@/constants/navigation"
import { GdfLogo } from "./GdfLogo"

export function MobileSidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  const accessibleLinks = user
    ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo))
    : []

  const groupedLinks = {
    Acompanhamento: accessibleLinks.filter(l => l.section === "Acompanhamento"),
    Administração: accessibleLinks.filter(l => l.section === "Administração"),
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col w-[85%] max-w-[300px] p-6">
        <div className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navegação do sistema SGAC.</SheetDescription>
        </div>

        {/* LOGO */}
        <div className="flex items-center gap-2 mb-8">
          <GdfLogo className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">SGAC-BRAZ</span>
        </div>

        {/* BOTÃO PRINCIPAL */}
        <Button
          onClick={() => {
            closeMenu()
            openNewCaseModal()
          }}
          className="w-full shadow-sm mb-6"
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Caso
        </Button>

        {/* LINKS */}
        <div className="flex-1 overflow-y-auto">
          <nav className="grid gap-8">
            {groupedLinks.Acompanhamento.length > 0 && (
              <MobileGroup title="Acompanhamento" links={groupedLinks.Acompanhamento} close={closeMenu} />
            )}
            {groupedLinks.Administração.length > 0 && (
              <MobileGroup title="Administração" links={groupedLinks.Administração} close={closeMenu} />
            )}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="border-t pt-4 mt-auto">
          <div className="px-2 text-sm font-medium">{user?.nome}</div>
          <div className="px-2 text-xs text-muted-foreground">{user?.cargo}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileGroup({ title, links, close }: any) {
  return (
    <div className="grid gap-1">
      <h4 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h4>
      {links.map((link: any) => (
        <MobileLink key={link.to} {...link} onClick={close} />
      ))}
    </div>
  )
}

function MobileLink({ to, icon: Icon, label, onClick }: any) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}
