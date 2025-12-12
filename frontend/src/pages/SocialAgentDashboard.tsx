// frontend/src/pages/SocialAgentDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, UserCheck, FolderInput, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card as UICard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { motion } from 'framer-motion'

interface AgentStats {
  role: 'Agente_Social'
  myActiveCases: number
  myClosedMonth: number
  myNewCasesMonth: number
}

// [NOVO] Skeleton de Agente
function AgentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl bg-muted/10" />
        <Skeleton className="h-64 rounded-xl bg-muted/10" />
      </div>
    </div>
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

  if (isLoading) return <AgentSkeleton />

  if (isError || !stats) {
    return (
      <div className="p-6 text-center text-sm text-destructive border border-destructive/20 rounded-xl bg-destructive/5">
        Não foi possível carregar as estatísticas.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 1. Cartões de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardStatCard
          index={0}
          title="Em Acolhida (Ativos)"
          value={stats.myActiveCases}
          icon={Users}
          colorClass="text-blue-500"
          description="Casos sob sua responsabilidade"
        />
        <DashboardStatCard
          index={1}
          title="Novos (Este Mês)"
          value={stats.myNewCasesMonth}
          icon={FolderInput}
          colorClass="text-amber-500"
          description="Triagens iniciadas"
        />
        <DashboardStatCard
          index={2}
          title="Finalizados (Este Mês)"
          value={stats.myClosedMonth}
          icon={UserCheck}
          colorClass="text-emerald-500"
          description="Encaminhados ou arquivados"
        />
      </div>

      {/* 2. Área de Ação Rápida */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Lado Esquerdo: Agenda */}
        <UpcomingAppointments />

        {/* Lado Direito: Atalho para gestão */}
        <UICard className="flex flex-col justify-center items-center p-8 text-center space-y-5 rounded-2xl border-dashed border-2 hover:border-primary/50 transition-colors bg-muted/5">
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-primary">Gestão de Triagem</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Acesse a lista completa para realizar evoluções, agendamentos ou encaminhamentos.
            </p>
          </div>
          <Link to={ROUTES.CASES}>
            <Button size="lg" className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
              Ver Minha Caixa de Acolhida <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </UICard>
      </motion.div>
    </div>
  )
}