// frontend/src/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from './constants/app-routes'
import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '@/types/user'

interface ProtectedRouteProps {
  children?: ReactNode
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isSessionLoading } = useAuth()
  const location = useLocation()

  // Enquanto a sessão é validada
  if (isSessionLoading || user === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center p-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // Usuário não autenticado → login
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // Usuário sem permissão → dashboard
  if (!allowedRoles.includes(user.cargo as UserRole)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  // Usuário autorizado → renderiza filhos ou Outlet
  return children || <Outlet />
}
