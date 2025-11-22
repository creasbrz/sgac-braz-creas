// frontend/src/pages/Dashboard.tsx
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { ManagerDashboard } from './ManagerDashboard'
import { TechnicianDashboard } from './TechnicianDashboard'

export function Dashboard() {
  const { user, isSessionLoading } = useAuth()

  // 1. Enquanto valida sessão
  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 2. Sessão inválida / expirada
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    )
  }

  // 3. Mapeamento explícito (previne erros futuros)
  const dashboards = {
    Gerente: <ManagerDashboard />,
    'Agente Social': <TechnicianDashboard />,
    Especialista: <TechnicianDashboard />,
  }

  const dashboard = dashboards[user.cargo] ?? (
    <div className="text-center p-6 border rounded">
      Cargo "{user.cargo}" não possui dashboard configurado.
    </div>
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bem-vindo, {user.nome}!</h1>
        <p className="text-muted-foreground">
          {user.cargo === 'Gerente'
            ? 'Resumo geral da unidade.'
            : 'Seus alertas e atividades recentes.'}
        </p>
      </header>

      {dashboard}
    </div>
  )
}
