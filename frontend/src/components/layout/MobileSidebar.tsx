// frontend/src/components/layout/MobileSidebar.tsx
import { NavLink } from 'react-router-dom'
import { Menu, HardHat } from 'lucide-react'
import { clsx } from 'clsx'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { navLinks } from './Sidebar'
import { GdfLogo } from './GdfLogo'

export function MobileSidebar() {
  const { user } = useAuth()

  const accessibleLinks = user
    ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo))
    : []

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu de navegação</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium" aria-label="Menu móvel">
          <NavLink
            to={user?.cargo === 'Gerente' ? ROUTES.DASHBOARD : ROUTES.CASES}
            className="flex items-center gap-3 text-lg font-semibold mb-4"
          >
            <GdfLogo />
            <span className="text-foreground">SGAC-BRAZ</span>
          </NavLink>
          {accessibleLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground transition-all hover:text-foreground',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

