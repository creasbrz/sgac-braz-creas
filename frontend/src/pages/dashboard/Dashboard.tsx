// frontend/src/pages/dashboard/Dashboard.tsx
import React, { Suspense, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ROUTES } from '@/constants/app-routes'

// Importação dinâmica (apenas do ManagerDashboard, já que os outros foram consolidados)
const ManagerDashboard = React.lazy(() => import('./ManagerDashboard').then(module => ({ default: module.ManagerDashboard })))

export function Dashboard() {
  const { user, isSessionLoading } = useAuth()
  const navigate = useNavigate()

  // [LÓGICA v8.1] Redirecionamento Automático
  useEffect(() => {
    if (!isSessionLoading && user) {
      const operationalRoles = ['Agente_Social', 'Especialista']
      
      // Se for operacional, manda direto para a Mesa de Trabalho (Workspace)
      if (operationalRoles.includes(user.cargo)) {
        navigate(ROUTES.WORKSPACE, { replace: true })
      }
    }
  }, [user, isSessionLoading, navigate])

  if (isSessionLoading) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <Loader2 className="absolute h-10 w-10 animate-spin text-primary [animation-duration:1.5s]" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando painel...</p>
      </div>
    )
  }

  if (!user) return null // AuthContext vai lidar com o redirecionamento para login

  // Se for operacional, o useEffect acima já redirecionou.
  // Se chegou aqui, é Gerente ou Auditor, então renderiza o Dashboard Gerencial unificado.
  return (
    <div className="space-y-8 pb-12">
      <main>
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-500">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="h-32 bg-muted/20 rounded-3xl border border-border/50 animate-pulse" />
             ))}
          </div>
        }>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <ManagerDashboard />
          </motion.div>
        </Suspense>
      </main>
    </div>
  )
}