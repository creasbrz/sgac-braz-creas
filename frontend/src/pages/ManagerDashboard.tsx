import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { Users, UserPlus, FolderOpen, FolderCheck, RefreshCw } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { AdvancedAnalytics } from './AdvancedAnalytics'

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
  lastUpdated?: string // Campo vindo do backend para indicar a idade do cache
}

export function ManagerDashboard() {
  const queryClient = useQueryClient()

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isRefetching
  } = useQuery<ManagerStats>({
    queryKey: ['stats', 'manager'],
    queryFn: async () => {
      const res = await api.get('/stats')
      return res.data
    },
    // Frontend confia no cache do backend (10 min), não faz polling agressivo
    staleTime: 1000 * 60 * 2, 
  })

  // Função para forçar atualização visual
  const handleForceRefresh = () => {
    // Invalida para garantir que a próxima busca tente ir ao servidor
    queryClient.invalidateQueries({ queryKey: ['stats', 'manager'] })
    refetch()
  }

  const renderOverview = () => {
    if (isLoading) return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </div>
    )

    if (isError) return (
      <Card className="border-destructive/40 bg-destructive/10 text-destructive">
        <CardHeader>
          <CardTitle>Erro ao carregar dados</CardTitle>
          <CardDescription>Verifique sua conexão.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => refetch()}>Tentar novamente</Button>
        </CardContent>
      </Card>
    )

    if (!stats) return null

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Barra de Ferramentas / Status do Cache */}
        <div className="flex justify-end items-center gap-3">
          {stats.lastUpdated && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-background px-2 py-1">
              Dados de: {format(new Date(stats.lastUpdated), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleForceRefresh}
            disabled={isRefetching}
            className="h-8 gap-2 text-muted-foreground"
            title="Recarregar dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* CARDS DE RESUMO */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DashboardStatCard title="Novos Casos (Mês)" value={stats.newCasesThisMonth} icon={UserPlus} colorClass="text-blue-500" />
          <DashboardStatCard title="Acolhidas Ativas" value={stats.acolhidasCount} icon={Users} colorClass="text-amber-500" />
          <DashboardStatCard title="Acompanhamentos PAEFI" value={stats.acompanhamentosCount} icon={FolderOpen} colorClass="text-purple-500" />
          <DashboardStatCard title="Desligados (Mês)" value={stats.closedCasesThisMonth} icon={FolderCheck} colorClass="text-emerald-500" />
        </motion.div>

        {/* GRÁFICOS OPERACIONAIS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Carga — Acolhida</CardTitle>
              <CardDescription>Casos distribuídos por agente social.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.workloadByAgent} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Carga — PAEFI</CardTitle>
              <CardDescription>Casos distribuídos por especialista.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.workloadBySpecialist} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* LISTAS ÚTEIS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingAppointments />
          <UpcomingPafDeadlines />
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="overview">Visão Operacional</TabsTrigger>
          <TabsTrigger value="analytics">Indicadores & IA</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
        {renderOverview()}
      </TabsContent>

      <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
        <AdvancedAnalytics />
      </TabsContent>
    </Tabs>
  )
}