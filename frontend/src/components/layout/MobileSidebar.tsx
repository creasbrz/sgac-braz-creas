// frontend/src/components/layout/MobileSidebar.tsx
import { useState, useMemo } from "react"
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

// --- TYPES ---
interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  allowedRoles: string[]
  section: string
}

interface MobileGroupProps {
  title: string
  links: NavItem[]
  close: () => void
}

interface MobileLinkProps extends NavItem {
  onClick: () => void
}

// --- COMPONENTS ---

const MobileGroup = ({ title, links, close }: MobileGroupProps) => (
  <div className="grid gap-1">
    <h4 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {title}
    </h4>
    {links.map((link) => (
      <MobileLink key={link.to} {...link} onClick={close} />
    ))}
  </div>
)

const MobileLink = ({ to, icon: Icon, label, onClick }: MobileLinkProps) => (
  <NavLink
    to={to}
    onClick={onClick}
    end
    className={({ isActive }) =>
      clsx(
        "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors active:scale-95 duration-200",
        isActive
          ? "bg-primary/10 text-primary border-r-4 border-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )
    }
  >
    <Icon className="h-5 w-5" />
    {label}
  </NavLink>
)

// --- MAIN COMPONENT ---

export function MobileSidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  // [PERFORMANCE] Memoização dos links
  const accessibleLinks = useMemo(() => {
    return user ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo)) : []
  }, [user])

  const groupedLinks = useMemo(() => ({
    Acompanhamento: accessibleLinks.filter(l => l.section === "Acompanhamento"),
    Administração: accessibleLinks.filter(l => l.section === "Administração"),
  }), [accessibleLinks])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label="Abrir Menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col w-[280px] sm:w-[300px] p-0 border-r shadow-xl"> 
        
        {/* HEADER DO MENU */}
        <SheetHeader className="p-6 border-b text-left bg-muted/10">
            <div className="flex items-center gap-3">
                <GdfLogo className="h-9 w-9 text-primary" />
                <div>
                    <SheetTitle className="text-xl font-bold tracking-tight">SGAC</SheetTitle>
                    <SheetDescription className="text-xs font-medium text-muted-foreground">Sistema de Gestão CREAS</SheetDescription>
                </div>
            </div>
        </SheetHeader>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Botão Novo Caso (Destaque) */}
            <Button
              onClick={() => {
                  closeMenu()
                  openNewCaseModal()
              }}
              className="w-full shadow-md font-bold"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" /> Novo Caso
            </Button>

            <nav className="grid gap-6">
                {groupedLinks.Acompanhamento.length > 0 && (
                  <MobileGroup title="Gestão" links={groupedLinks.Acompanhamento} close={closeMenu} />
                )}
                {groupedLinks.Administração.length > 0 && (
                  <MobileGroup title="Sistema" links={groupedLinks.Administração} close={closeMenu} />
                )}
            </nav>
        </div>

        {/* RODAPÉ DO USUÁRIO */}
        <div className="border-t p-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-foreground">{user?.nome}</span>
              <span className="text-xs text-muted-foreground uppercase truncate font-medium">{user?.cargo?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}