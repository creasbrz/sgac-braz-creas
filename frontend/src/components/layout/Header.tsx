// frontend/src/components/layout/Header.tsx
import { LogOut, Slash } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "./MobileSidebar"
import { useLocation } from "react-router-dom"

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const pageName = location.pathname.split("/")[1] || "Dashboard"
  const formattedTitle =
    pageName.charAt(0).toUpperCase() + pageName.slice(1)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur">
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline-block font-medium text-foreground">
          SGAC
        </span>
        <Slash className="hidden sm:inline-block h-4 w-4 text-muted-foreground/40" />
        <span className="font-medium text-foreground">
          {formattedTitle}
        </span>
      </div>

      {/* AÇÕES */}
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />

        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-medium leading-none">
            {user?.nome}
          </span>
          <span className="text-xs text-muted-foreground">
            {user?.cargo}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
