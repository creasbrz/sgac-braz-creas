import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Users, Activity, 
  FileCheck, Clock, AlertTriangle, ArrowUpRight, 
  CheckCircle2, PieChart as PieIcon,
  AlertCircle
} from 'lucide-react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ROUTES } from '@/constants/routes'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments' // [NOVO IMPORT]

import { 
  URGENCIA_GRAVISSIMA, URGENCIA_MUITO_GRAVE, 
  URGENCIA_GRAVE, URGENCIA_LEVE 
} from '@/constants/caseConstants'

const COLORS = {
  ALTA: '#ef4444',    
  MEDIA: '#f97316',   
  BAIXA: '#10b981',   
  NEUTRO: '#94a3b8'   
}

const getAlertDetails = (type: string, days: number) => {
  switch (type) {
    case 'PAF_NOT_STARTED':
      return { label: 'PAF não iniciado', icon: AlertCircle, color: 'text-red-600 dark:text-red-400' }
    case 'PAF_REVIEW_OVERDUE':
      return { label: `Revisão vencida (${days}d)`, icon: Clock, color: 'text-orange-600 dark:text-orange-400' }
    case 'PAF_STALLED':
      return { label: `Sem evolução (${days}d)`, icon: Activity, color: 'text-amber-600 dark:text-amber-400' }
    default:
      return { label: 'Atenção necessária', icon: AlertTriangle, color: 'text-slate-600 dark:text-slate-400' }
  }
}

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, theme }: any) => {
  const themes: any = {
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    emerald: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    purple: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
  }
  
  const activeStyle = themes[theme] || themes.blue

  return (
    <Card className={`overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all ${activeStyle} border-y border-r border-border/50`}>
      <CardContent className="p-5 flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">{title}</p>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {trend && (
            <div className="flex items-center text-xs mt-1 font-medium opacity-90">
              <span>{trend > 0 ? '+' : ''}{trend}% {trendLabel}</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-full bg-white/50 dark:bg-black/20">
           <Icon className="w-6 h-6" />
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

  if (isError) return <div className="p-6 text-destructive">Erro ao carregar dados.</div>

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-96 lg:col-span-2"/><Skeleton className="h-96"/></div>
    </div>
  )

  const myCases = data.myCases || []
  const urgencyCount = myCases.reduce((acc: any, curr: any) => {
    const term = curr.urgencia?.toUpperCase() || 'N/A'
    let key = 'NEUTRO'
    if (URGENCIA_GRAVISSIMA.some(u => term.includes(u)) || URGENCIA_MUITO_GRAVE.some(u => term.includes(u))) key = 'ALTA'
    else if (URGENCIA_GRAVE.some(u => term.includes(u))) key = 'MEDIA'
    else if (URGENCIA_LEVE.some(u => term.includes(u))) key = 'BAIXA'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, { ALTA: 0, MEDIA: 0, BAIXA: 0, NEUTRO: 0 })

  const chartData = [
    { name: 'Alta/Crítica', value: urgencyCount.ALTA, color: COLORS.ALTA },
    { name: 'Média', value: urgencyCount.MEDIA, color: COLORS.MEDIA },
    { name: 'Baixa/Estável', value: urgencyCount.BAIXA, color: COLORS.BAIXA },
    { name: 'Sem Classif.', value: urgencyCount.NEUTRO, color: COLORS.NEUTRO },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Famílias PAEFI" value={data.detailedStats?.acompanhamento || 0} icon={Users} theme="blue" trend={2.5} trendLabel="mês"/>
        <StatCard title="Adesão PAF" value="92%" icon={FileCheck} theme="emerald" trend={1} trendLabel="conformidade"/>
        <StatCard title="Aguardando Aceite" value={data.detailedStats?.acolhidaEsp || 0} icon={Clock} theme="amber" trendLabel="na fila"/>
        <StatCard title="Monitoramento" value={data.detailedStats?.monitoramento || 0} icon={Activity} theme="purple" trendLabel="fase final"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. GRÁFICO */}
        <Card className="shadow-sm border-border bg-card lg:col-span-2 flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary"/> Distribuição de Risco
            </CardTitle>
            <CardDescription>Complexidade da carteira ativa.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 relative">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <PieIcon className="h-10 w-10 opacity-20" />
                <span>Sem dados</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    cx="40%" 
                    cy="50%" 
                    innerRadius={80} 
                    outerRadius={110} 
                    paddingAngle={4} 
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ paddingRight: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. COLUNA DIREITA */}
        <div className="space-y-6">
          
          {/* [CORREÇÃO] Agenda agora usa o componente unificado com Scroll ativado */}
          <UpcomingAppointments 
            data={data.appointments} 
            title="Hoje" 
            enableScroll 
          />

          {/* ALERTAS */}
          <Card className="border-l-4 border-l-red-500 shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center text-red-600 dark:text-red-400">
                <AlertTriangle className="mr-2 h-4 w-4"/> Pendências Prioritárias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.alerts?.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500"/> Tudo em dia.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                   {data.alerts?.slice(0, 4).map((alert: any) => {
                     const details = getAlertDetails(alert.type, alert.days)
                     const Icon = details.icon

                     return (
                       <div 
                          key={alert.id} 
                          className="flex items-start justify-between p-2.5 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                          onClick={() => navigate(`${ROUTES.CASES}/${alert.id}`)}
                       >
                          <div className="overflow-hidden mr-2">
                              <p className="truncate font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                {alert.nomeCompleto}
                              </p>
                              <div className={`flex items-center gap-1.5 text-xs mt-0.5 font-medium ${details.color}`}>
                                 <Icon className="h-3 w-3" />
                                 <span>{details.label}</span>
                              </div>
                          </div>
                          
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                     )
                   })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}