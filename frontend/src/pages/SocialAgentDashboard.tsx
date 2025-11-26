import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, UserCheck, FolderInput, LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

interface AgentStats {
  role: 'Agente_Social' // [CORREÇÃO]
  myActiveCases: number
  myClosedMonth: number
  myNewCasesMonth: number
}

interface StatCardProps {
  title: string
  value: number | undefined
  icon: LucideIcon
  colorClass: string
}

function StatCard({ title, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? '-'}</div>
      </CardContent>
    </Card>
  )
}

export function SocialAgentDashboard() {
  const { data: stats, isLoading, isError } = useQuery<AgentStats>({
    queryKey: ['stats', 'agent'],
    queryFn: async () => {
      const res = await api.get('/stats')
      return res.data
    },
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="text-center text-sm text-red-600">
        Não foi possível carregar as estatísticas.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Cartões de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Em Acolhida (Ativos)"
          value={stats.myActiveCases}
          icon={Users}
          colorClass="text-blue-500"
        />
        <StatCard
          title="Novos (Este Mês)"
          value={stats.myNewCasesMonth}
          icon={FolderInput}
          colorClass="text-amber-500"
        />
        <StatCard
          title="Finalizados (Este Mês)"
          value={stats.myClosedMonth}
          icon={UserCheck}
          colorClass="text-emerald-500"
        />
      </div>

      {/* 2. Área de Ação Rápida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Agenda */}
        <UpcomingAppointments />

        {/* Lado Direito: Atalho para gestão */}
        <Card className="flex flex-col justify-center items-center p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold">Gestão de Casos</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Acesse a lista completa para realizar evoluções ou encaminhamentos.
          </p>
          <Button asChild size="lg" className="w-full max-w-xs">
            <Link to={ROUTES.CASES}>Ver Minha Caixa de Acolhida</Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
