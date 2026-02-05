// frontend/src/components/layout/MobileSidebar.tsx
import { useState, useMemo } from "react"
import { NavLink } from "react-router-dom"
import { Menu, Plus, ShieldCheck } from "lucide-react"
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

import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext"
import { NAV_LINKS, type NavLink as NavLinkType } from "@/constants/app-navigation"

// --- TYPES ---
interface MobileGroupProps {
  title: string
  links: NavLinkType[]
  close: () => void
}

interface MobileLinkProps {
  item: NavLinkType
  onClick: () => void
}

// --- COMPONENTS ---

const MobileGroup = ({ title, links, close }: MobileGroupProps) => {
  if (links.length === 0) return null
  return (
    <div className="grid gap-1">
      <h4 className="px-3 mb-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
        {title}
      </h4>
      {links.map((link) => (
        <MobileLink key={link.to} item={link} onClick={close} />
      ))}
    </div>
  )
}

const MobileLink = ({ item, onClick }: MobileLinkProps) => {
  const Icon = item.icon
  
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      end
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
          isActive
            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

// --- MAIN COMPONENT ---

export function MobileSidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  // Memoização dos links acessíveis
  const accessibleLinks = useMemo(() => {
    if (!user) return []
    return NAV_LINKS.filter((link) => {
       if (!link.allowedRoles) return true
       return link.allowedRoles.includes(user.cargo)
    })
  }, [user])

  // Agrupamento
  const groupedLinks = useMemo(() => ({
    MeuTrabalho: accessibleLinks.filter(l => l.section === "Meu Trabalho"),
    GestaoCasos: accessibleLinks.filter(l => l.section === "Gestão de Casos"),
    Administracao: accessibleLinks.filter(l => l.section === "Administração"),
  }), [accessibleLinks])

  if (!user) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 md:hidden hover:bg-muted/50" aria-label="Abrir Menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col w-72 sm:w-80 p-0 border-r border-border shadow-xl bg-background"> 
        
        {/* HEADER */}
        <SheetHeader className="p-6 border-b border-border text-left bg-muted/10">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 shrink-0">
                   <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <SheetTitle className="text-xl font-bold tracking-tight text-foreground">SGAC<span className="text-muted-foreground font-normal ml-1 text-base">Braz</span></SheetTitle>
                    <SheetDescription className="text-xs font-medium text-muted-foreground/80">Sistema de Gestão CREAS</SheetDescription>
                </div>
            </div>
        </SheetHeader>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            
            {/* Ação Principal */}
            <Button
              onClick={() => {
                  closeMenu()
                  openNewCaseModal()
              }}
              className="w-full shadow-md font-bold tracking-wide h-11 text-base bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" /> Novo Caso
            </Button>

            {/* Links de Navegação */}
            <nav className="flex flex-col gap-6">
                <MobileGroup title="Meu Trabalho" links={groupedLinks.MeuTrabalho} close={closeMenu} />
                <MobileGroup title="Gestão de Casos" links={groupedLinks.GestaoCasos} close={closeMenu} />
                <MobileGroup title="Administração" links={groupedLinks.Administracao} close={closeMenu} />
            </nav>
        </div>

        {/* RODAPÉ DO USUÁRIO */}
        <div className="border-t border-border p-4 bg-muted/5">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shrink-0 shadow-sm">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-semibold truncate text-foreground leading-tight">{user.nome}</span>
              <span className="text-[10px] text-muted-foreground uppercase truncate font-bold tracking-wide mt-0.5">{user.cargo.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}