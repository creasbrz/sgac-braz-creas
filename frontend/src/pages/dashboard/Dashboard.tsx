// frontend/src/pages/Dashboard.tsx
import React from 'react' // [CORREÇÃO] Import necessário para tipagem
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { ManagerDashboard } from './ManagerDashboard'
import { TechnicianDashboard } from './TechnicianDashboard'
import { SocialAgentDashboard } from './SocialAgentDashboard'

type Cargo = 'Gerente' | 'Agente_Social' | 'Especialista' | string

// [CORREÇÃO] Tipo React.ReactNode em vez de JSX.Element
const DASHBOARD_BY_ROLE: Record<Cargo, React.ReactNode> = {
  Gerente: <ManagerDashboard />,
  'Agente_Social': <SocialAgentDashboard />,
  Especialista: <TechnicianDashboard />,
}

export function Dashboard() {
  const { user, isSessionLoading } = useAuth()

  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    )
  }

  const dashboard = DASHBOARD_BY_ROLE[user.cargo] ?? (
    <div className="text-center p-6 border rounded-md">
      Cargo "{user.cargo}" não possui dashboard configurado.
    </div>
  )

  const subtitle =
    user.cargo === 'Agente_Social'
      ? 'Painel de Acolhida e Triagem.'
      : user.cargo === 'Gerente'
      ? 'Resumo geral da unidade.'
      : 'Seus alertas e atividades recentes.'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bem-vindo, {user.nome}!</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </header>

      {dashboard}
    </div>
  )
}