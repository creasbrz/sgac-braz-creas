// frontend/src/pages/TechnicianDashboard.tsx — Página do painel do Especialista (PAEFI), modernizada e otimizada.

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
    staleTime: 1000 * 60 * 5, // cache suave de 5 min
    retry: 1, // evita loops de erro
  })

  /** Skeleton padronizado */
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  )

  /** Estado de erro elegante */
  if (isError) {
    return (
      <div className="p-4 rounded-xl border bg-destructive/10 text-destructive">
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

  return (
    <div className="space-y-6">
      {/* 1 — Cards de estatística */}
      {isLoading ? (
        renderSkeletons()
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DashboardStatCard
            title="Meus Casos PAEFI"
            value={stats?.myActiveCases}
            icon={Activity}
            colorClass="text-blue-500"
            description="Em acompanhamento ativo"
          />

          <DashboardStatCard
            title="Novos (Mês)"
            value={stats?.myNewCasesMonth}
            icon={Clock}
            colorClass="text-amber-500"
            description="Atribuídos este mês"
          />

          <DashboardStatCard
            title="Finalizados (Mês)"
            value={stats?.myClosedMonth}
            icon={CheckCircle}
            colorClass="text-emerald-500"
            description="Desligamentos realizados"
          />
        </motion.div>
      )}

      {/* 2 — Área de trabalho */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments />
        <UpcomingPafDeadlines />
      </div>
    </div>
  )
}
