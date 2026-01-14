import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Users, Activity, FileCheck, Clock, AlertTriangle, ArrowUpRight, 
  CheckCircle2, PieChart as PieIcon, AlertCircle, LucideIcon 
} from 'lucide-react'
import { PieChart, Pie, Label } from 'recharts' // Recharts puro é usado internamente
import { useNavigate } from 'react-router-dom'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart'

import { ROUTE_PATHS } from '@/constants/app-routes'
import { URGENCIA_NIVEIS } from '@/constants/cases/definitions'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CONFIGURAÇÃO DO GRÁFICO (NOVO) ---
// Define labels e cores mapeadas para CSS Variables ou Variáveis do Tema
const chartConfig = {
  cases: {
    label: "Casos",
  },
  alta: {
    label: "Alta/Crítica",
    color: "hsl(var(--destructive))", // Usa a cor de erro do tema
  },
  media: {
    label: "Média",
    color: "hsl(var(--chart-4))", // Laranja (baseado no index.css)
  },
  baixa: {
    label: "Baixa/Estável",
    color: "hsl(var(--chart-2))", // Verde/Emerald (baseado no index.css)
  },
  neutro: {
    label: "Sem Classif.",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

// --- TYPES & HELPERS ---
interface AlertDetails {
  label: string
  icon: LucideIcon
  colorClass: string
  bgClass: string
}

const getAlertDetails = (type: string, days: number): AlertDetails => {
  switch (type) {
    case 'PAF_NOT_STARTED':
      return { 
        label: 'PAF não iniciado', 
        icon: AlertCircle, 
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10'
      }
    case 'PAF_REVIEW_OVERDUE':
      return { 
        label: `Revisão vencida (${days}d)`, 
        icon: Clock, 
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-900/20'
      }
    case 'PAF_STALLED':
      return { 
        label: `Sem evolução (${days}d)`, 
        icon: Activity, 
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-100 dark:bg-amber-900/20'
      }
    default:
      return { 
        label: 'Atenção necessária', 
        icon: AlertTriangle, 
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted'
      }
  }
}

// Componente StatCard (Mantido igual à versão anterior refatorada)
interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'info'
}

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, variant = 'default' }: StatCardProps) => {
  const variants = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
    warning: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    info: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  }
  const iconStyles = variants[variant] || variants.default

  return (
    <Card className="hover:shadow-md transition-shadow duration-300 border-border/60">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-lg transition-colors", iconStyles)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
              trend > 0 
                ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" 
                : "text-destructive bg-destructive/10"
            )}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground line-clamp-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</h3>
            {trendLabel && <span className="text-xs text-muted-foreground truncate lowercase">{trendLabel}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TechnicianDashboard() {
  const navigate = useNavigate()
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspace-summary'],
    queryFn: async () => (await api.get('/workspace/summary')).data,
    refetchInterval: 1000 * 60 * 5 
  })

  // --- LOADING & ERROR STATES (Mantidos para brevidade) ---
  if (isLoading) return <div className="p-6 space-y-6 animate-pulse"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>
  if (isError) return <div className="p-6 text-destructive">Erro ao carregar dashboard.</div>

  const myCases = data.myCases || []
  
  // Lógica de Contagem (Mantida intacta)
  const urgencyCount = myCases.reduce((acc: Record<string, number>, curr: any) => {
    const term = (curr.urgencia || '').toUpperCase()
    let key = 'neutro' // Chaves minúsculas para bater com o chartConfig
    
    if (URGENCIA_NIVEIS.GRAVISSIMA.some(u => term.includes(u.toUpperCase())) || 
        URGENCIA_NIVEIS.MUITO_GRAVE.some(u => term.includes(u.toUpperCase()))) {
        key = 'alta'
    } else if (URGENCIA_NIVEIS.GRAVE.some(u => term.includes(u.toUpperCase()))) {
        key = 'media'
    } else if (URGENCIA_NIVEIS.LEVE.some(u => term.includes(u.toUpperCase()))) {
        key = 'baixa'
    }
    
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, { alta: 0, media: 0, baixa: 0, neutro: 0 })

  // Preparação dos dados para o Shadcn Chart
  // Note o uso de `fill: "var(--color-key)"` que linka com o config
  const chartData = [
    { type: 'alta', value: urgencyCount.alta, fill: "var(--color-alta)" },
    { type: 'media', value: urgencyCount.media, fill: "var(--color-media)" },
    { type: 'baixa', value: urgencyCount.baixa, fill: "var(--color-baixa)" },
    { type: 'neutro', value: urgencyCount.neutro, fill: "var(--color-neutro)" },
  ].filter(d => d.value > 0)

  const totalCases = chartData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="space-y-8 animate-in fade-in p-1">
      
      {/* 1. KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Famílias Acompanhadas" value={data.detailedStats?.acompanhamento || 0} icon={Users} variant="default" trend={2.5} trendLabel="novos" />
        <StatCard title="Adesão ao PAF" value="92%" icon={FileCheck} variant="success" trend={1} trendLabel="conformidade" />
        <StatCard title="Aguardando Aceite" value={data.detailedStats?.acolhidaEsp || 0} icon={Clock} variant="warning" trendLabel="fila" />
        <StatCard title="Em Monitoramento" value={data.detailedStats?.monitoramento || 0} icon={Activity} variant="info" trendLabel="final" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 2. GRÁFICO MIGRADO PARA SHADCN CHARTS */}
        <Card className="lg:col-span-2 flex flex-col h-[450px] shadow-sm border-border/60">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Distribuição de Risco
            </CardTitle>
            <CardDescription>Complexidade da carteira ativa</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {chartData.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                 <PieIcon className="h-10 w-10 opacity-20 mb-2" />
                 <span>Sem dados</span>
               </div>
            ) : (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {/* Label Central (Total) */}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                {totalCases}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                Casos Totais
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="type" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm text-muted-foreground pt-4">
             <div className="flex items-center gap-2 font-medium leading-none">
                Tendência de alta complexidade em 5% <Activity className="h-4 w-4" />
             </div>
             <div className="leading-none text-muted-foreground">
                Exibindo dados atualizados da carteira
             </div>
          </CardFooter>
        </Card>

        {/* 3. COLUNA DIREITA (Agenda e Alertas) - Mantido igual para focar na migração do gráfico */}
        <div className="space-y-6 flex flex-col h-full">
          <UpcomingAppointments data={data.appointments} title="Agenda de Hoje" enableScroll />
          
          <Card className="shadow-sm border-border/60 overflow-hidden bg-card">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                   <AlertTriangle className="h-4 w-4"/> Pendências Prioritárias
                </CardTitle>
                {data.alerts?.length > 0 && (
                  <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20">
                    {data.alerts.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(!data.alerts || data.alerts.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/50"/> 
                  <span className="text-sm font-medium">Tudo em dia!</span>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                   {data.alerts.slice(0, 4).map((alert: any) => {
                     const details = getAlertDetails(alert.type, alert.days)
                     const Icon = details.icon
                     return (
                       <li key={alert.id}>
                         <button
                           type="button"
                           onClick={() => navigate(`${ROUTE_PATHS.CASES}/${alert.id}`)}
                           className="w-full text-left p-3 hover:bg-muted/50 transition-all group flex items-start justify-between"
                         >
                           <div className="flex gap-3 overflow-hidden">
                             <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0 flex items-center justify-center h-8 w-8", details.bgClass)}>
                               <Icon className={cn("h-4 w-4", details.colorClass)} />
                             </div>
                             <div className="min-w-0 flex-1">
                               <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors privacy-mask">
                                 {alert.nomeCompleto}
                               </p>
                               <p className={cn("text-xs mt-0.5 font-medium", details.colorClass)}>
                                 {details.label}
                               </p>
                             </div>
                           </div>
                           <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 mt-1" />
                         </button>
                       </li>
                     )
                   })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}