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
  SheetHeader
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

      {/* FIX: Largura fixa (300px) para não ficar estranho em telas muito pequenas */}
      <SheetContent side="left" className="flex flex-col w-[300px] p-0"> 
        
        <SheetHeader className="p-6 border-b text-left">
            <div className="flex items-center gap-3">
                <GdfLogo className="h-8 w-8 text-primary" />
                <div>
                    <SheetTitle className="text-lg font-bold">SGAC-BRAZ</SheetTitle>
                    <SheetDescription className="text-xs">Sistema de Gestão CREAS</SheetDescription>
                </div>
            </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
            {/* Botão Novo Caso */}
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

            <nav className="grid gap-6">
                {groupedLinks.Acompanhamento.length > 0 && (
                <MobileGroup title="Acompanhamento" links={groupedLinks.Acompanhamento} close={closeMenu} />
                )}
                {groupedLinks.Administração.length > 0 && (
                <MobileGroup title="Administração" links={groupedLinks.Administração} close={closeMenu} />
                )}
            </nav>
        </div>

        <div className="border-t p-4 bg-muted/30">
          <div className="text-sm font-medium">{user?.nome}</div>
          <div className="text-xs text-muted-foreground uppercase">{user?.cargo}</div>
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
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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