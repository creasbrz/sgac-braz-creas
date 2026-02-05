import { useState, Suspense, lazy } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
  Users, UserPlus, FolderOpen, FolderCheck, RefreshCw, 
  Activity, Briefcase, LucideIcon, BarChart3, LayoutDashboard, FileText,
  AlertCircle
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
} from "@/components/ui/chart"

// Domain Components (Lazy Loaded para performance nas abas)
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'

// Abas Lazy Loading
const AdvancedAnalytics = lazy(() => import('../AdvancedAnalytics').then(m => ({ default: m.AdvancedAnalytics })))
const GlobalAudit = lazy(() => import('../GlobalAudit').then(m => ({ default: m.GlobalAudit })))

// PDF Imports
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { ManagementReportDoc } from '@/components/reports/templates/ManagementReportDoc'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES & CONFIG ---
const workloadChartConfig = {
  cases: {
    label: "Casos Ativos",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

interface StatData { name: string; value: number }

interface ManagerStats {
  newCasesThisMonth: number
  closedCasesThisMonth: number
  acolhidasCount: number
  acompanhamentosCount: number
  workloadByAgent: StatData[]
  workloadBySpecialist: StatData[]
  lastUpdated?: string
}

// --- SUB-COMPONENT: STAT CARD ---
const ManagerStatCard = ({ title, value, icon: Icon, variant = 'blue', description }: { 
  title: string, value: number, icon: LucideIcon, variant?: 'blue' | 'amber' | 'purple' | 'emerald', description?: string 
}) => {
  const themes = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900",
    purple: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 border-violet-100 dark:border-violet-900",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
      <CardContent className="p-6 flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</span>
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
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
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl w-full" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => <Skeleton key={i} className="h-75 rounded-xl w-full" />)}
      </div>
    </div>
  )
}

// --- COMPONENT: OVERVIEW TAB CONTENT ---
// Isolamos o conteúdo da aba "Visão Geral" para organizar o código
const OverviewContent = () => {
  const queryClient = useQueryClient()
  
  const { data: vigData } = useQuery({ 
    queryKey: ['stats', 'vigilancia'],
    queryFn: async () => (await api.get('/stats/vigilancia')).data
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
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  })

  if (isLoading) return <DashboardSkeleton />
  
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-destructive/5 text-destructive m-4">
      <AlertCircle className="h-10 w-10 mb-3 opacity-50"/>
      <p className="font-medium">Erro ao carregar indicadores.</p>
      <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">Tentar Novamente</Button>
    </div>
  )

  if (!stats) return null

  // Ordenação dos dados
  const agentData = [...stats.workloadByAgent].sort((a, b) => b.value - a.value).map(d => ({ ...d, fill: "hsl(var(--primary))" }))
  const specialistData = [...stats.workloadBySpecialist].sort((a, b) => b.value - a.value).map(d => ({ ...d, fill: "hsl(var(--chart-2))" }))

  // Preparação para Relatório PDF
  const reportData = {
    periodo: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
    stats: {
      ativos: stats.acolhidasCount + stats.acompanhamentosCount,
      acolhidas: stats.acolhidasCount,
      paefi: stats.acompanhamentosCount,
      novos: stats.newCasesThisMonth,
      desligados: stats.closedCasesThisMonth
    },
    cargaHoraria: { agentes: stats.workloadByAgent, especialistas: stats.workloadBySpecialist },
    vigilancia: vigData ? {
      violacoes: vigData.violationData?.slice(0, 8) || [],
      demografia: vigData.ageData || [],
      territorio: []
    } : undefined
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    toast.info("Atualizando dados...")
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
        <div>
          <h3 className="font-semibold text-foreground">Indicadores Operacionais</h3>
          <p className="text-sm text-muted-foreground">
            Atualizado: {stats.lastUpdated ? format(new Date(stats.lastUpdated), "HH:mm") : 'Agora'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching} className="h-9 gap-2">
            <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && 'animate-spin')} /> Atualizar
          </Button>
          <PDFDownloadButton 
            document={<ManagementReportDoc data={reportData as any} />}
            fileName={`Relatorio_Gestao_${format(new Date(), 'MM-yyyy')}.pdf`}
            label="Relatório PDF"
            variant="default"
            size="sm"
            className="h-9"
          />
        </div>
      </div>

      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ManagerStatCard title="Novos (Mês)" value={stats.newCasesThisMonth} icon={UserPlus} variant="blue" description="Entradas no período" />
        <ManagerStatCard title="Acolhida" value={stats.acolhidasCount} icon={Users} variant="amber" description="Aguardando/Triagem" />
        <ManagerStatCard title="PAEFI" value={stats.acompanhamentosCount} icon={FolderOpen} variant="purple" description="Em acompanhamento" />
        <ManagerStatCard title="Desligados" value={stats.closedCasesThisMonth} icon={FolderCheck} variant="emerald" description="Saídas no período" />
      </div>

      {/* 2. GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4"/> Carga: Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workloadChartConfig} className="min-h-62.5 w-full">
              <BarChart accessibilityLayer data={agentData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={12} width={100} />
                <XAxis type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} className="opacity-90 hover:opacity-100">
                  <LabelList dataKey="value" position="right" fontSize={11} className="fill-foreground font-bold" />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4"/> Carga: Especialistas</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={workloadChartConfig} className="min-h-62.5 w-full">
              <BarChart accessibilityLayer data={specialistData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={12} width={100} />
                <XAxis type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} className="opacity-90 hover:opacity-100">
                  <LabelList dataKey="value" position="right" fontSize={11} className="fill-foreground font-bold" />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 3. OPERACIONAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-full"><UpcomingAppointments enableScroll className="h-full border-border/60" /></div>
        <div className="lg:col-span-1 h-full"><UpcomingPafDeadlines className="h-full border-border/60" /></div>
        <div className="lg:col-span-1 h-full"><RecentActivityFeed className="h-full border-border/60" /></div>
      </div>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---
export function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="w-full space-y-6 p-6 max-w-400 mx-auto">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Painel de Gestão</h2>
        <p className="text-muted-foreground">Monitoramento estratégico e operacional da unidade.</p>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b">
          <TabsList className="h-auto p-0 bg-transparent gap-6">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2 px-0"
            >
              <LayoutDashboard className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2 px-0"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics & IA
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-2 px-0"
            >
              <FileText className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TABS CONTENT WITH SUSPENSE */}
        <div className="min-h-125">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
              <p>Carregando módulo...</p>
            </div>
          }>
            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
              <OverviewContent />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
              <AdvancedAnalytics />
            </TabsContent>

            <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
              <GlobalAudit />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  )
}