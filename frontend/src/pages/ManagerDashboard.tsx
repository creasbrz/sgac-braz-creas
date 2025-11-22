// frontend/src/pages/ManagerDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'

interface StatData {
  name: string
  value: number
}

interface ManagerStats {
  newCasesThisMonth: number
  closedCasesThisMonth: number
  acolhidasCount: number
  acompanhamentosCount: number
  workloadByAgent: StatData[]
  workloadBySpecialist: StatData[]
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/4" />
      </CardContent>
    </Card>
  )
}

function StatCard({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold text-primary leading-tight">
          {value ?? '-'}
        </div>
      </CardContent>
    </Card>
  )
}

export function ManagerDashboard() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<ManagerStats>({
    queryKey: ['stats', 'manager'],
    queryFn: async () => {
      const res = await api.get('/stats')
      return res.data
    },
  })

  return (
    <>
      {/* ESTADO — ERRO */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle>Erro ao carregar dados</CardTitle>
            <CardDescription>
              Não foi possível carregar as estatísticas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ESTADO — LOADING */}
      {!isError && isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <StatCardSkeleton key={idx} />
          ))}
        </div>
      )}

      {/* ESTADO — OK */}
      {!isError && !isLoading && stats && (
        <>
          {/* CARDS SUPERIORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Novos Casos (Mês)"
              description="Entradas registradas este mês."
              value={stats.newCasesThisMonth}
            />
            <StatCard
              title="Casos Desligados (Mês)"
              description="Encerrados no período."
              value={stats.closedCasesThisMonth}
            />
            <StatCard
              title="Acolhidas Ativas"
              description="Casos em fase de acolhida."
              value={stats.acolhidasCount}
            />
            <StatCard
              title="Acompanhamentos PAEFI"
              description="Casos ativos em acompanhamento técnico."
              value={stats.acompanhamentosCount}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-right">
            Atualizado em: {new Date().toLocaleString('pt-BR')}
          </p>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Carga de Trabalho — Acolhida</CardTitle>
                <CardDescription>
                  Distribuição de casos entre agentes sociais.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.workloadByAgent} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Carga de Trabalho — PAEFI</CardTitle>
                <CardDescription>
                  Casos por especialista técnico.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={stats.workloadBySpecialist}
                    layout="vertical"
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* SEÇÕES COMPLEMENTARES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <UpcomingAppointments />
            <UpcomingPafDeadlines />
          </div>
        </>
      )}
    </>
  )
}
