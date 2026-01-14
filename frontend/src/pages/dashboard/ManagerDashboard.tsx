// frontend/src/pages/dashboard/ManagerDashboard.tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
  Users, UserPlus, FolderOpen, FolderCheck, RefreshCw, 
  FileText, Loader2, Activity, Briefcase, LucideIcon 
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

import { generateManagementPDF } from '@/utils/pdfGenerator'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CONFIGURAÇÃO DOS GRÁFICOS (Shadcn Charts) ---
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
  const themes = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-900",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6 flex items-start justify-between">
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
        <div className={cn("p-3 rounded-xl border", themes[variant])}>
          <Icon className="w-5 h-5" />
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
        {[1,2].map(i => <Skeleton key={i} className="h-[300px] rounded-xl w-full" />)}
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---

export function ManagerDashboard() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExportFullReport = async () => {
    if (!stats) return
    setIsExporting(true)

    try {
      const vigilanciaRes = await api.get('/stats/vigilancia')
      const vigData = vigilanciaRes.data

      generateManagementPDF({
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
        vigilancia: {
          violacoes: vigData.violationData.slice(0, 8),
          demografia: vigData.ageData,
          territorio: []
        }
      })
      
      toast.success("Relatório gerado e baixado.")
    } catch (error) {
      console.error(error)
      toast.error("Falha ao gerar o relatório.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleForceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stats', 'manager'] })
    refetch()
    toast.info("Atualizando indicadores...")
  }

  const renderOverview = () => {
    if (isLoading) return <DashboardSkeleton />

    if (isError) return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-destructive/5 text-destructive">
        <Activity className="h-10 w-10 mb-3 opacity-50"/>
        <p className="font-medium">Erro ao carregar indicadores gerenciais.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    )

    if (!stats) return null

    const agentData = stats.workloadByAgent.map(d => ({ ...d, fill: "var(--color-cases)" }))
    const specialistData = stats.workloadBySpecialist.map(d => ({ ...d, fill: "var(--color-cases)" }))

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* HEADER & TOOLBAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
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
              className="h-9 gap-2"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && 'animate-spin')} />
              <span className="sr-only sm:not-sr-only">Atualizar</span>
            </Button>

            <Button 
              variant="default" 
              size="sm" 
              onClick={handleExportFullReport} 
              disabled={isExporting}
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <FileText className="h-3.5 w-3.5"/>}
              {isExporting ? "Gerando PDF..." : "Relatório Mensal"}
            </Button>
          </div>
        </div>

        {/* 1. KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary"/> Carga de Trabalho — Agentes
              </CardTitle>
              <CardDescription>Distribuição de casos ativos por técnico.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={workloadChartConfig} className="min-h-[200px] max-h-[300px] w-full">
                <BarChart
                  accessibilityLayer
                  data={agentData}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={12}
                    width={100}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" fontSize={12} fill="hsl(var(--foreground))" formatter={(val: number) => val > 0 ? val : ''} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Carga Especialistas */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary"/> Carga de Trabalho — Especialistas
              </CardTitle>
              <CardDescription>Volume de PAEFI por técnico de referência.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={workloadChartConfig} className="min-h-[200px] max-h-[300px] w-full">
                <BarChart
                  accessibilityLayer
                  data={specialistData}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={12}
                    width={100}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" fontSize={12} fill="hsl(var(--foreground))" formatter={(val: number) => val > 0 ? val : ''} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* 3. OPERATIONAL FEEDS (Altura Igualada) */}
        {/* Usamos a grid padrão (que tem items-stretch implícito) e forçamos os filhos a terem h-full */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col">
            <UpcomingAppointments enableScroll className="h-full min-h-[400px]" />
          </div>
          <div className="lg:col-span-1 flex flex-col">
            <UpcomingPafDeadlines className="h-full min-h-[400px]" />
          </div>
          <div className="lg:col-span-1 flex flex-col">
            <RecentActivityFeed className="h-full min-h-[400px]" />
          </div>
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