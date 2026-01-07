import { useState } from 'react' // [ADD]
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner' // [ADD]

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { Users, UserPlus, FolderOpen, FolderCheck, RefreshCw, FileText, Loader2 } from 'lucide-react' // [ADD FileText, Loader2]
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { AdvancedAnalytics } from '../AdvancedAnalytics'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'

// Import da nova função
import { generateManagementPDF } from '@/utils/pdfGenerator'

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
  lastUpdated?: string
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/20" />))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (<Skeleton key={i} className="h-64 w-full rounded-lg" />))}
      </div>
    </div>
  )
}

export function ManagerDashboard() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false) // [NOVO STATE]

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isRefetching
  } = useQuery<ManagerStats>({
    queryKey: ['stats', 'manager'],
    queryFn: async () => (await api.get('/stats')).data,
    staleTime: 1000 * 60 * 2,
  })

  // [NOVA FUNÇÃO] Gera o relatório completo buscando dados extras se necessário
  const handleExportFullReport = async () => {
    if (!stats) return
    setIsExporting(true)

    try {
      // Busca dados de vigilância (que podem não estar carregados se o usuário não abriu a aba Analytics)
      const vigilanciaRes = await api.get('/stats/vigilancia')
      const vigData = vigilanciaRes.data

      generateManagementPDF({
        periodo: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
        stats: {
          ativos: stats.acolhidasCount + stats.acompanhamentosCount, // Aproximação
          acolhidas: stats.acolhidasCount,
          paefi: stats.acompanhamentosCount,
          novos: stats.newCasesThisMonth,
          desligados: stats.closedCasesThisMonth
        },
        cargaHoraria: {
          agentes: stats.workloadByAgent,
          especialistas: stats.workloadBySpecialist
        },
        vigilancia: {
          violacoes: vigData.violationData.slice(0, 8), // Top 8 violações
          demografia: vigData.ageData,
          territorio: []
        }
      })
      
      toast.success("Relatório gerado com sucesso!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao gerar dados para o relatório.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleForceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'manager'] })
    refetch()
  }

  const renderOverview = () => {
    if (isLoading) return <DashboardSkeleton />

    if (isError) return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">Erro ao carregar dados.</div>
    )

    if (!stats) return null

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Barra de Ferramentas */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
          {stats.lastUpdated && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-background px-2 py-1">
              Dados de: {format(new Date(stats.lastUpdated), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Badge>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportFullReport} 
              disabled={isExporting}
              className="h-8 gap-2 w-full sm:w-auto"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <FileText className="h-3.5 w-3.5 text-red-600"/>}
              {isExporting ? "Gerando..." : "Relatório PDF"}
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleForceRefresh}
              disabled={isRefetching}
              className="h-8 gap-2 text-muted-foreground w-full sm:w-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardStatCard index={0} title="Novos Casos (Mês)" value={stats.newCasesThisMonth} icon={UserPlus} colorClass="text-blue-500" />
          <DashboardStatCard index={1} title="Acolhidas Ativas" value={stats.acolhidasCount} icon={Users} colorClass="text-amber-500" />
          <DashboardStatCard index={2} title="Acompanhamentos PAEFI" value={stats.acompanhamentosCount} icon={FolderOpen} colorClass="text-purple-500" />
          <DashboardStatCard index={3} title="Desligados (Mês)" value={stats.closedCasesThisMonth} icon={FolderCheck} colorClass="text-emerald-500" />
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Carga — Acolhida</CardTitle><CardDescription>Casos por agente.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.workloadByAgent} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Carga — PAEFI</CardTitle><CardDescription>Casos por especialista.</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.workloadBySpecialist} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* LISTAS E FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 min-h-[300px]"><UpcomingAppointments /></div>
          <div className="lg:col-span-1 min-h-[300px]"><UpcomingPafDeadlines /></div>
          <div className="lg:col-span-1 min-h-[300px]"><RecentActivityFeed /></div>
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