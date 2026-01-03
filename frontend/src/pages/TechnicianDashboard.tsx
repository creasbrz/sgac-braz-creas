// frontend/src/pages/TechnicianDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Activity, CheckCircle, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { motion } from 'framer-motion'

interface SpecialistStats {
  role: 'Especialista'
  myActiveCases: number
  myClosedMonth: number
  myNewCasesMonth: number
}

// [NOVO] Skeleton de Especialista
function TechnicianSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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

export function TechnicianDashboard() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<SpecialistStats>({
    queryKey: ['stats', 'specialist'],
    queryFn: async () => {
      const res = await api.get('/stats')
      return res.data
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  if (isError) {
    return (
      <div className="p-4 rounded-xl border bg-destructive/10 text-destructive text-center">
        <p className="font-medium">❌ Erro ao carregar os dados.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm underline hover:text-destructive/70"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (isLoading) return <TechnicianSkeleton />

  return (
    <div className="space-y-8">
      {/* 1 — Cards de estatística */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardStatCard
          index={0}
          title="Meus Casos PAEFI"
          value={stats?.myActiveCases}
          icon={Activity}
          colorClass="text-blue-500"
          description="Em acompanhamento ativo"
        />
        <DashboardStatCard
          index={1}
          title="Novos (Mês)"
          value={stats?.myNewCasesMonth}
          icon={Clock}
          colorClass="text-amber-500"
          description="Atribuídos este mês"
        />
        <DashboardStatCard
          index={2}
          title="Finalizados (Mês)"
          value={stats?.myClosedMonth}
          icon={CheckCircle}
          colorClass="text-emerald-500"
          description="Desligamentos realizados"
        />
      </div>

      {/* 2 — Área de trabalho com animação */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <UpcomingAppointments />
        <UpcomingPafDeadlines />
      </motion.div>
    </div>
  )
}