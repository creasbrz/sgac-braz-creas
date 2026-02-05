// frontend/src/pages/dashboard/TechnicianDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Users, Activity, FileCheck, Clock, AlertTriangle, ArrowUpRight, 
  CheckCircle2, PieChart as PieIcon, AlertCircle, LucideIcon 
} from 'lucide-react'
import { PieChart, Pie, Label } from 'recharts'
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

// --- CONFIGURAÇÃO DO GRÁFICO (Cores do Tema) ---
const chartConfig = {
  cases: { label: "Casos" },
  alta: {
    label: "Alta/Crítica",
    color: "hsl(var(--destructive))", // Vermelho
  },
  media: {
    label: "Média",
    color: "hsl(var(--chart-4))", // Laranja/Amber
  },
  baixa: {
    label: "Baixa/Estável",
    color: "hsl(var(--chart-2))", // Verde/Emerald
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
  borderClass: string
}

const getAlertDetails = (type: string, days: number): AlertDetails => {
  switch (type) {
    case 'PAF_NOT_STARTED':
      return { 
        label: 'PAF não iniciado', 
        icon: AlertCircle, 
        colorClass: 'text-status-error-fg',
        bgClass: 'bg-status-error-bg',
        borderClass: 'border-status-error-border'
      }
    case 'PAF_REVIEW_OVERDUE':
      return { 
        label: `Revisão vencida (${days}d)`, 
        icon: Clock, 
        colorClass: 'text-status-warning-fg',
        bgClass: 'bg-status-warning-bg',
        borderClass: 'border-status-warning-border'
      }
    case 'PAF_STALLED':
      return { 
        label: `Sem evolução (${days}d)`, 
        icon: Activity, 
        colorClass: 'text-status-warning-fg',
        bgClass: 'bg-status-warning-bg',
        borderClass: 'border-status-warning-border'
      }
    default:
      return { 
        label: 'Atenção necessária', 
        icon: AlertTriangle, 
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted',
        borderClass: 'border-border'
      }
  }
}

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  variant?: 'default' | 'success' | 'warning' | 'info'
}

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, variant = 'default' }: StatCardProps) => {
  // Mapeamento para Tokens Semânticos
  const variants = {
    default: {
      container: "border-primary/20",
      icon: "text-primary bg-primary/10",
      stripe: "bg-primary"
    },
    success: {
      container: "border-status-success-border",
      icon: "text-status-success-fg bg-status-success-bg",
      stripe: "bg-status-success-fg"
    },
    warning: {
      container: "border-status-warning-border",
      icon: "text-status-warning-fg bg-status-warning-bg",
      stripe: "bg-status-warning-fg"
    },
    info: {
      container: "border-status-info-border",
      icon: "text-status-info-fg bg-status-info-bg",
      stripe: "bg-status-info-fg"
    },
  }
  
  const style = variants[variant] || variants.default

  return (
    <Card className={cn("hover:shadow-md transition-all duration-300 relative group overflow-hidden border", style.container)}>
      {/* Faixa lateral no hover */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.75 opacity-0 group-hover:opacity-100 transition-opacity", style.stripe)} />
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl transition-colors border border-transparent shadow-sm", style.icon)}>
            <Icon className="w-5 h-5" strokeWidth={2.5} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-xs font-bold px-2 py-0.5 rounded-full border",
              trend > 0 
                ? "text-status-success-fg bg-status-success-bg border-status-success-border" 
                : "text-status-error-fg bg-status-error-bg border-status-error-border"
            )}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        <div className="mt-4 space-y-1 relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 line-clamp-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</h3>
            {trendLabel && <span className="text-xs text-muted-foreground truncate lowercase opacity-80">{trendLabel}</span>}
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

  // Loading Skeleton
  if (isLoading) return (
    <div className="p-1 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl w-full"/>)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-112.5 lg:col-span-2 rounded-xl"/>
            <Skeleton className="h-112.5ounded-xl"/>
        </div>
    </div>
  )

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 p-6 text-center border border-dashed rounded-lg bg-status-error-bg/10 border-status-error-border text-status-error-fg">
      <AlertTriangle className="h-10 w-10 mb-3 opacity-80" />
      <p className="text-sm font-medium">Não foi possível carregar o painel.</p>
    </div>
  )

  const myCases = data.myCases || []
  
  // Lógica de Agrupamento de Risco
  const urgencyCount = myCases.reduce((acc: Record<string, number>, curr: any) => {
    const term = (curr.urgencia || '').toUpperCase()
    let key = 'neutro'
    
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
        
        {/* 2. GRÁFICO (Risco da Carteira) */}
        <Card className="lg:col-span-2 flex flex-col h-112.5 shadow-sm border-border/60 bg-card">
          <CardHeader className="items-center pb-0 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground/90">
              <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20">
                 <Activity className="h-4 w-4 text-primary" />
              </div>
              Distribuição de Risco
            </CardTitle>
            <CardDescription className="text-xs">Complexidade da carteira ativa</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 pb-0 relative flex items-center justify-center">
            {chartData.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                 <div className="p-4 bg-muted/50 rounded-full">
                    <PieIcon className="h-8 w-8 opacity-40" />
                 </div>
                 <span className="text-sm font-medium">Sem dados suficientes</span>
               </div>
            ) : (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-70 w-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={65}
                    strokeWidth={4}
                    stroke="hsl(var(--background))" // Borda branca para separar fatias
                    paddingAngle={2}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-4xl font-bold tracking-tighter">
                                {totalCases}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Casos
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  
                  <ChartLegend 
                    content={({ payload }) => <ChartLegendContent payload={payload} nameKey="type" />} 
                    className="-translate-y-2 flex-wrap gap-2 text-xs font-medium" 
                  />
                  
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-xs text-muted-foreground pt-4 pb-4 border-t bg-muted/5">
              <div className="flex items-center gap-1.5 font-medium">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>Análise de Vulnerabilidade</span>
              </div>
              <p className="text-center opacity-70 px-4">
                Dados baseados na classificação de risco mais recente de cada caso.
              </p>
          </CardFooter>
        </Card>

        {/* 3. COLUNA DIREITA (Agenda + Alertas) */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Agenda Compacta */}
          <UpcomingAppointments 
             data={data.appointments} 
             title="Agenda de Hoje" 
             enableScroll 
             className="h-60 shadow-sm border-border/60"
          />
          
          {/* Alertas de PAF */}
          <Card className="shadow-sm border-border/60 overflow-hidden bg-card flex-1 min-h-50">
            <CardHeader className="pb-3 px-5 py-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2.5 text-foreground">
                   <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-status-error-bg border border-status-error-border text-status-error-fg">
                      <AlertTriangle className="h-4 w-4"/> 
                   </div>
                   Pendências Prioritárias
                </CardTitle>
                {data.alerts?.length > 0 && (
                  <span className="text-[10px] font-bold bg-status-error-bg text-status-error-fg px-2 py-0.5 rounded-full border border-status-error-border">
                    {data.alerts.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(!data.alerts || data.alerts.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
                  <div className="p-3 bg-status-success-bg border border-status-success-border rounded-full">
                     <CheckCircle2 className="h-6 w-6 text-status-success-fg"/> 
                  </div>
                  <span className="text-xs font-medium">Tudo em dia!</span>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                   {data.alerts.slice(0, 4).map((alert: any) => {
                     const details = getAlertDetails(alert.type, alert.days)
                     const AlertIcon = details.icon
                     
                     return (
                       <li key={alert.id}>
                         <button
                           type="button"
                           onClick={() => navigate(`${ROUTE_PATHS.CASES}/${alert.id}`)}
                           className="w-full text-left p-3.5 hover:bg-muted/30 transition-all group flex items-start justify-between"
                         >
                           <div className="flex gap-3 overflow-hidden">
                             {/* Ícone do Alerta */}
                             <div className={cn(
                               "mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border shadow-sm", 
                               details.bgClass,
                               details.borderClass
                             )}>
                               <AlertIcon className={cn("h-4 w-4", details.colorClass)} strokeWidth={2.5} />
                             </div>
                             
                             <div className="min-w-0 flex-1 pt-0.5">
                               <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                 {alert.nomeCompleto}
                               </p>
                               <p className={cn("text-xs mt-0.5 font-medium", details.colorClass)}>
                                 {details.label}
                               </p>
                             </div>
                           </div>
                           
                           <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 mt-1" />
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