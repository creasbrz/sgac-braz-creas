// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { HardHat } from 'lucide-react'
import { clsx } from 'clsx'

import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GdfLogo } from './GdfLogo'
import { Button } from '../ui/button'
import { useModal } from '@/hooks/useModal'
import { PlusCircle } from 'lucide-react'
import { navLinks } from '@/constants/navigation' // Importa os links do novo ficheiro

export function Sidebar() {
  const { user } = useAuth()
  const { openNewCaseModal } = useModal()

  const accessibleLinks = user
    ? navLinks.filter((link) => link.allowedRoles.includes(user.cargo))
    : []

  return (
    <aside className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <NavLink
            to={user?.cargo === 'Gerente' ? ROUTES.DASHBOARD : ROUTES.CASES}
            className="flex items-center gap-3 font-semibold"
          >
            <GdfLogo />
            <span className="text-foreground">SGAC-BRAZ</span>
          </NavLink>
        </div>
        <div className="flex-1">
          <nav
            className="grid items-start px-2 text-sm font-medium lg:px-4"
            aria-label="Menu principal"
          >
            {user?.cargo === 'Gerente' && (
              <div className="px-1 py-2">
                <Button
                  size="sm"
                  className="w-full justify-start gap-3"
                  onClick={openNewCaseModal}
                >
                  <PlusCircle className="h-4 w-4" />
                  Novo Caso
                </Button>
              </div>
            )}
            <TooltipProvider>
              {accessibleLinks.map(({ to, icon: Icon, label }) => (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={to}
                      end
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                          isActive && 'bg-muted text-primary',
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>
        </div>
      </div>
    </aside>
  )
}