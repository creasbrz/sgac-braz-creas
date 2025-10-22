// frontend/src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { UpcomingAppointments } from '@/components/UpcomingAppointments'

interface StatData {
  name: string
  value: number
}

interface ManagerStats {
  totalCases: number
  acolhidasCount: number
  acompanhamentosCount: number
  newCasesThisMonth: number
  closedCasesThisMonth: number
  workloadByAgent: StatData[]
  workloadBySpecialist: StatData[]
}

interface StatCardProps {
  title: string
  description: string
  value?: number
}

function StatCard({ title, description, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{value ?? '-'}</p>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-1/4" />
      </CardContent>
    </Card>
  )
}

function ManagerDashboard() {
  const { data: stats, isLoading, isError, refetch } = useQuery<ManagerStats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/stats')
      return response.data
    },
  })

  return (
    <>
      {isError ? (
        <Card className="border-destructive/50 bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle>Erro ao Carregar Dados</CardTitle>
            <CardDescription className="text-destructive/80">
              Não foi possível buscar as estatísticas do painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Casos Novos no Mês" description="Entradas este mês." value={stats?.newCasesThisMonth} />
            <StatCard title="Casos Desligados no Mês" description="Finalizados este mês." value={stats?.closedCasesThisMonth} />
            <StatCard title="Acolhidas Ativas" description="Casos em acolhida." value={stats?.acolhidasCount} />
            <StatCard title="Acompanhamentos Ativos" description="Casos em PAEFI." value={stats?.acompanhamentosCount} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            Atualizado em: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Carga de Trabalho - Acolhida</CardTitle>
              <CardDescription>Casos em acolhida por Agente Social.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.workloadByAgent} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Carga de Trabalho - Acompanhamento</CardTitle>
              <CardDescription>Casos em PAEFI por Especialista.</CardDescription>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={250}>
                 <BarChart data={stats?.workloadBySpecialist} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

function TechnicianDashboard() {
  return (
    <UpcomingAppointments />
  )
}

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.nome}!</h1>
        <p className="text-muted-foreground">
          {user?.cargo === 'Gerente'
            ? 'Aqui está um resumo da atividade recente no sistema.'
            : 'Consulte os seus próximos agendamentos e aceda aos seus casos no menu.'}
        </p>
      </div>

      {user?.cargo === 'Gerente' ? (
        <ManagerDashboard />
      ) : (
        <TechnicianDashboard />
      )}
    </div>
  )
}