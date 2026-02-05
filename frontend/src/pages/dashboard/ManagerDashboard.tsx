// frontend/src/pages/dashboard/ManagerDashboard.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
  Users, UserPlus, FolderOpen, FolderCheck, RefreshCw, 
  Activity, Briefcase, LucideIcon 
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from "@/components/ui/chart"

// Domain Components
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import { AdvancedAnalytics } from '../AdvancedAnalytics'

// Imports de PDF
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { ManagementReportDoc } from '@/components/reports/templates/ManagementReportDoc'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CONFIGURAÇÃO DOS GRÁFICOS ---
const workloadChartConfig = {
  cases: {
    label: "Casos Ativos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

// --- TYPES ---
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

// --- SUB-COMPONENTS ---

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  variant?: 'blue' | 'amber' | 'purple' | 'emerald'
  description?: string
}

const ManagerStatCard = ({ title, value, icon: Icon, variant = 'blue', description }: StatCardProps) => {
  // Cores Modernizadas (Padrão Pastel 50 + Vivid 500)
  const themes = {
    blue: "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
    amber: "bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
    purple: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400 border-violet-100 dark:border-violet-500/20",
    emerald: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative group">
       {/* Faixa lateral colorida no hover [CORREÇÃO: w-[3px] -> w-0.75] */}
       <div className={cn("absolute left-0 top-0 bottom-0 w-0.75 opacity-0 group-hover:opacity-100 transition-opacity", themes[variant].split(' ')[0].replace('50', '500'))} />
       
      <CardContent className="p-6 flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
              {value}
            </span>
          </div>
          {description && (
             <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl border shadow-sm", themes[variant])}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      <div className="flex justify-between items-center mb-8">
         <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
         </div>
         <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl w-full" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* [CORREÇÃO: h-[300px] -> h-75] */}
        {[1,2].map(i => <Skeleton key={i} className="h-75 rounded-xl w-full" />)}
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---

export function ManagerDashboard() {
  const queryClient = useQueryClient()
  
  const { data: vigData } = useQuery({ 
    queryKey: ['stats', 'vigilancia'],
    queryFn: async () => (await api.get('/stats/vigilancia')).data,
    enabled: true 
  })

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

  const handleForceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'manager'] })
    refetch()
    toast.info("Atualizando indicadores...")
  }

  const reportData = stats ? {
    periodo: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
    stats: {
      ativos: stats.acolhidasCount + stats.acompanhamentosCount,
      acolhidas: stats.acolhidasCount,
      paefi: stats.acompanhamentosCount,
      novos: stats.newCasesThisMonth,
      desligados: stats.closedCasesThisMonth
    },
    cargaHoraria: {
      agentes: stats.workloadByAgent,
      especialistas: stats.workloadBySpecialist
    },
    vigilancia: vigData ? {
      violacoes: vigData.violationData.slice(0, 8),
      demografia: vigData.ageData,
      territorio: []
    } : undefined
  } : null

  const renderOverview = () => {
    if (isLoading) return <DashboardSkeleton />

    if (isError) return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-status-error-bg/10 text-status-error-fg m-4">
        <Activity className="h-10 w-10 mb-3 opacity-50"/>
        <p className="font-medium">Erro ao carregar indicadores gerenciais.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-status-error-border text-status-error-fg hover:bg-status-error-bg">
          Tentar Novamente
        </Button>
      </div>
    )

    if (!stats) return null

    // [CORREÇÃO: ORDENAÇÃO DECRESCENTE]
    // Preparando e ordenando dados para gráficos (Maior para Menor)
    const agentData = stats.workloadByAgent
        .sort((a, b) => b.value - a.value)
        .map(d => ({ ...d, fill: "hsl(var(--primary))" }))

    const specialistData = stats.workloadBySpecialist
        .sort((a, b) => b.value - a.value)
        .map(d => ({ ...d, fill: "hsl(var(--chart-2))" }))

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HEADER & TOOLBAR (Sticky Glass) */}
        <div className="sticky top-0 z-10 -mx-6 -mt-2 px-6 py-4 bg-background/80 backdrop-blur-md border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Visão Geral</h2>
            <p className="text-muted-foreground text-sm">Monitoramento operacional e estratégico.</p>
          </div>

          <div className="flex items-center gap-2">
            {stats.lastUpdated && (
              <span className="text-xs text-muted-foreground mr-2 hidden sm:inline-block">
                Atualizado: {format(new Date(stats.lastUpdated), "HH:mm", { locale: ptBR })}
              </span>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleForceRefresh}
              disabled={isRefetching}
              className="h-9 gap-2 bg-background border-border/60 shadow-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && 'animate-spin')} />
              <span className="sr-only sm:not-sr-only">Atualizar</span>
            </Button>

            {reportData && (
              <PDFDownloadButton 
                document={<ManagementReportDoc data={reportData as any} />}
                fileName={`Relatorio_Gerencial_${format(new Date(), 'MM-yyyy')}.pdf`}
                label="Relatório Mensal"
                variant="default"
                size="sm"
                className="h-9"
              />
            )}
          </div>
        </div>

        {/* 1. KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
          <ManagerStatCard 
            title="Novos Casos" 
            value={stats.newCasesThisMonth} 
            icon={UserPlus} 
            variant="blue"
            description="Entradas neste mês"
          />
          <ManagerStatCard 
            title="Acolhidas Ativas" 
            value={stats.acolhidasCount} 
            icon={Users} 
            variant="amber" 
            description="Famílias em triagem"
          />
          <ManagerStatCard 
            title="Acompanhamentos" 
            value={stats.acompanhamentosCount} 
            icon={FolderOpen} 
            variant="purple" 
            description="PAEFI ativo"
          />
          <ManagerStatCard 
            title="Desligamentos" 
            value={stats.closedCasesThisMonth} 
            icon={FolderCheck} 
            variant="emerald" 
            description="Casos encerrados (Mês)"
          />
        </div>

        {/* 2. GRÁFICOS DE CARGA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carga Agentes */}
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary"/> Carga de Trabalho — Agentes
              </CardTitle>
              <CardDescription>Distribuição de casos ativos por técnico.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* [CORREÇÃO: min-h-[200px] -> min-h-50, max-h-[300px] -> max-h-75] */}
              <ChartContainer config={workloadChartConfig} className="min-h-50 max-h-75 w-full">
                <BarChart
                  accessibilityLayer
                  data={agentData}
                  layout="vertical"
                  margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={12}
                    width={110}
                    className="font-medium text-xs"
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    className="opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      fontSize={11} 
                      className="fill-foreground font-bold" 
                      formatter={(val: any) => val > 0 ? val : ''} 
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Carga Especialistas */}
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--chart-2))]"/> Carga de Trabalho — Especialistas
              </CardTitle>
              <CardDescription>Volume de PAEFI por técnico de referência.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* [CORREÇÃO: min-h-[200px] -> min-h-50, max-h-[300px] -> max-h-75] */}
              <ChartContainer config={workloadChartConfig} className="min-h-50 max-h-75 w-full">
                <BarChart
                  accessibilityLayer
                  data={specialistData}
                  layout="vertical"
                  margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={12}
                    width={110}
                    className="font-medium text-xs"
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                    className="opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      fontSize={11} 
                      className="fill-foreground font-bold" 
                      formatter={(val: any) => val > 0 ? val : ''} 
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* 3. OPERATIONAL FEEDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col h-full">
            {/* [CORREÇÃO: min-h-[400px] -> min-h-100] */}
            <UpcomingAppointments enableScroll className="h-full min-h-100 shadow-sm border-border/50" />
          </div>
          <div className="lg:col-span-1 flex flex-col h-full">
             {/* [CORREÇÃO: min-h-[400px] -> min-h-100] */}
            <UpcomingPafDeadlines className="h-full min-h-100 shadow-sm border-border/50" />
          </div>
          <div className="lg:col-span-1 flex flex-col h-full">
             {/* [CORREÇÃO: min-h-[400px] -> min-h-100] */}
            <RecentActivityFeed className="h-full min-h-100 shadow-sm border-border/50" />
          </div>
        </div>
      </div>
    )
  }

  return (
    // [CORREÇÃO: max-w-[1600px] -> max-w-400]
    <div className="w-full space-y-6 p-4 md:p-8 max-w-400 mx-auto">
       <Tabs defaultValue="overview" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* [CORREÇÃO: sm:w-[400px] -> sm:w-100] */}
            <TabsList className="grid w-full sm:w-100 grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Visão Operacional</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Indicadores & IA</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
            {renderOverview()}
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
            <AdvancedAnalytics />
        </TabsContent>
        </Tabs>
    </div>
  )
}