// frontend/src/pages/Dashboard.tsx
import React, { Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, LayoutDashboard, UserCircle, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

// Importação dinâmica para melhor performance de carregamento inicial
const ManagerDashboard = React.lazy(() => import('./ManagerDashboard').then(module => ({ default: module.ManagerDashboard })))
const SocialAgentDashboard = React.lazy(() => import('./SocialAgentDashboard').then(module => ({ default: module.SocialAgentDashboard })))
const TechnicianDashboard = React.lazy(() => import('./TechnicianDashboard').then(module => ({ default: module.TechnicianDashboard })))

type Cargo = 'Gerente' | 'Agente_Social' | 'Especialista' | string

const DASHBOARD_BY_ROLE: Record<Cargo, React.ReactNode> = {
  Gerente: <ManagerDashboard />,
  'Agente_Social': <SocialAgentDashboard />,
  Especialista: <TechnicianDashboard />,
}

export function Dashboard() {
  const { user, isSessionLoading, logout } = useAuth()

  if (isSessionLoading) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <Loader2 className="absolute h-10 w-10 animate-spin text-primary [animation-duration:1.5s]" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A preparar o seu painel...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-status-error-bg border border-status-error-border p-6 rounded-2xl text-center space-y-4 shadow-sm"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-status-error-fg/10 flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-status-error-fg" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-lg">Sessão Expirada</h3>
            <p className="text-sm text-muted-foreground">Por segurança, por favor faça login novamente para aceder aos seus dados.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="w-full py-2.5 bg-foreground text-background rounded-xl font-semibold text-sm hover:opacity-90 transition-all active:scale-95"
          >
            Voltar ao Login
          </button>
        </motion.div>
      </div>
    )
  }

  const dashboard = DASHBOARD_BY_ROLE[user.cargo] ?? (
    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-3xl border-muted/50 text-muted-foreground">
       <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
       <p className="font-medium text-lg">Cargo "{user.cargo}" sem painel configurado.</p>
       <p className="text-sm max-w-xs text-center mt-2">Contacte o administrador para associar as permissões correctas ao seu perfil.</p>
    </div>
  )

  const subtitle =
    user.cargo === 'Agente_Social'
      ? 'Painel de Acolhida e Triagem.'
      : user.cargo === 'Gerente'
      ? 'Resumo estratégico e operacional da unidade.'
      : 'Acompanhamento de casos e actividades recentes.'

  return (
    <div className="space-y-8 pb-12">
      {/* Header com Design Premium */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-primary mb-1">
             <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Sistema Ativo</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
            Olá, {user.nome.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            {subtitle}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
           {/* Informação de Cargo removida conforme solicitado */}
           <button 
             onClick={logout}
             title="Sair do sistema"
             className="p-3 rounded-2xl bg-muted/30 text-muted-foreground hover:bg-status-error-bg hover:text-status-error-fg transition-all duration-300 group border border-border/40"
           >
              <LogOut className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
           </button>
        </motion.div>
      </header>

      {/* Área do Dashboard com transição suave */}
      <main>
        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-500">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="h-32 bg-muted/20 rounded-3xl border border-border/50 animate-pulse" />
             ))}
          </div>
        }>
          <motion.div
            key={user.cargo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {dashboard}
          </motion.div>
        </Suspense>
      </main>
    </div>
  )
}