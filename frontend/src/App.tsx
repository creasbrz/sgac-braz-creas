// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Cases } from '@/pages/Cases'
import { ClosedCases } from '@/pages/ClosedCases' // Importa a nova página
import { TeamOverview } from '@/pages/TeamOverview' // Importa a nova página
import { NotFound } from '@/pages/NotFound'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { CaseDetail } from '@/pages/CaseDetail'
import { Reports } from '@/pages/Reports'
import { Agenda } from '@/pages/Agenda'
import { MainLayout } from '@/components/layout/MainLayout'
import { UserManagement } from '@/pages/UserManagement'

function PrivateRoute() {
  const { isAuthenticated, isSessionLoading } = useAuth()

  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return isAuthenticated ? <MainLayout /> : <Navigate to={ROUTES.LOGIN} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />

      {/* Agrupa as rotas protegidas sob o layout principal */}
      <Route element={<PrivateRoute />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.CASES} element={<Cases />} />
        <Route path={ROUTES.CLOSED_CASES} element={<ClosedCases />} />
        <Route path={ROUTES.TEAM_OVERVIEW} element={<TeamOverview />} />
        <Route path={ROUTES.AGENDA} element={<Agenda />} />
        <Route path={ROUTES.REPORTS} element={<Reports />} />
        <Route path={ROUTES.CASE_DETAIL} element={<CaseDetail />} />
        <Route path={ROUTES.USER_MANAGEMENT} element={<UserManagement />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}