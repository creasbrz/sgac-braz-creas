// frontend/src/components/analytics/sections/PerformanceSection.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { Users, Gift, Clock, Activity, CheckCircle, AlertCircle, LucideIcon } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart"

import type { ObservatoryData } from '@/types/case'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- LOCAL COMPONENTS (Design System) ---
interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'blue' | 'amber' | 'green' | 'purple'
}

const StatCard = ({ title, value, icon: Icon, description, variant = 'blue' }: StatCardProps) => {
  const themes = {
    blue: {
      border: "border-status-info-border",
      bg: "bg-status-info-bg",
      text: "text-status-info-fg",
      stripe: "bg-status-info-fg"
    },
    amber: {
      border: "border-status-warning-border",
      bg: "bg-status-warning-bg",
      text: "text-status-warning-fg",
      stripe: "bg-status-warning-fg"
    },
    green: {
      border: "border-status-success-border",
      bg: "bg-status-success-bg",
      text: "text-status-success-fg",
      stripe: "bg-status-success-fg"
    },
    purple: {
      border: "border-status-ai-border",
      bg: "bg-status-ai-bg",
      text: "text-status-ai-fg",
      stripe: "bg-status-ai-fg"
    }
  }

  const theme = themes[variant] || themes.blue

  return (
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border relative group", theme.border)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity", theme.stripe)} />
      <div className="p-6 flex items-start justify-between">
        <div className="space-y-1 relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground font-medium pt-1 line-clamp-1">{description}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl transition-colors border shadow-sm", theme.bg, theme.border)}>
          <Icon className={cn("w-5 h-5", theme.text)} strokeWidth={2.5} />
        </div>
      </div>
    </Card>
  )
}

// --- CHART CONFIG ---
const benefitsChartConfig = {
  value: {
    label: "Concessões",
    color: "hsl(var(--chart-2))", // Emerald/Green
  },
} satisfies ChartConfig

// --- MAIN COMPONENT ---
export function PerformanceSection({ data }: { data: ObservatoryData }) {
  
  // Data extraction with safe defaults
  const benefits = data.benefitsData || []
  // Top 5 benefícios mais concedidos
  const sortedBenefits = [...benefits].sort((a, b) => b.value - a.value).slice(0, 5)
  const efficiency = data.efficiencyData || {}

  // Collective Data Helpers
  const totalParticipants = data.collectiveData?.totalParticipants ?? 0
  const avgAttendance = data.collectiveData?.avgAttendance ?? 0

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. KPIs de Eficiência */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          title="Tempo de Acompanhamento" 
          value={efficiency.avgPermanence ?? 0} 
          description="dias (média)"
          icon={Clock} 
          variant="blue" 
        />
        <StatCard 
          title="Tempo de Espera" 
          value={efficiency.avgWaitTime ?? 0} 
          description="dias até 1º atendimento"
          icon={Activity} 
          variant="amber" 
        />
        <StatCard 
          title="Total Desligamentos" 
          value={efficiency.totalClosed ?? 0} 
          description="casos finalizados"
          icon={CheckCircle} 
          variant="green" 
        />
      </section>

      {/* 2. Métricas de Volume e Benefícios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card: Grupos e Oficinas (Custom Layout) */}
        <Card className="lg:col-span-1 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-ai-bg border border-status-ai-border">
                 <Users className="h-4 w-4 text-status-ai-fg"/>
              </div>
              Atividades Coletivas
            </CardTitle>
            <CardDescription>Engajamento em grupos e oficinas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-4 p-6">
              
              {/* Sub-metric 1: Total Participantes */}
              <div className="flex items-center justify-between p-4 bg-status-ai-bg/10 rounded-xl border border-status-ai-border/20">
                <div>
                   <p className="text-xs font-bold text-status-ai-fg uppercase tracking-wider">Participantes</p>
                   <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
                     {totalParticipants}
                   </p>
                </div>
                <div className="p-3 bg-background rounded-full border border-status-ai-border/20 shadow-sm">
                   <Users className="h-6 w-6 text-status-ai-fg" />
                </div>
              </div>
              
              {/* Sub-metric 2: Média por Grupo */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Média por Grupo</p>
                   <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                     {avgAttendance} <span className="text-sm font-medium text-muted-foreground ml-1">pessoas</span>
                   </p>
                </div>
              </div>
          </CardContent>
        </Card>

        {/* Card: Benefícios (Chart) */}
        <Card className="lg:col-span-2 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-success-bg border border-status-success-border">
                 <Gift className="h-4 w-4 text-status-success-fg"/>
              </div>
              Concessão de Benefícios
            </CardTitle>
            <CardDescription>Principais benefícios entregues no período.</CardDescription>
          </CardHeader>
          {/* [CORREÇÃO] min-h-[300px] -> min-h-75 */}
          <CardContent className="flex-1 p-6 min-h-75">
            {sortedBenefits.length > 0 ? (
              // [CORREÇÃO] max-h-[280px] -> max-h-70
              <ChartContainer config={benefitsChartConfig} className="w-full h-full max-h-70">
                <BarChart 
                  accessibilityLayer
                  data={sortedBenefits} 
                  layout="vertical" 
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                    // Truncate long names to keep layout clean
                    tickFormatter={(val) => val.length > 20 ? `${val.substring(0, 20)}...` : val}
                  />
                  <ChartTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }}
                    // [CORREÇÃO] min-w-[150px] -> min-w-37.5
                    content={<ChartTooltipContent indicator="line" className="min-w-37.5" />} 
                  />
                  <Bar 
                    dataKey="value" 
                    fill="var(--color-value)" 
                    radius={[0, 4, 4, 0]} 
                    barSize={24}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      className="fill-foreground font-bold text-xs" 
                      // [CORREÇÃO TS] Usando 'any' e cast para Number para evitar erro 2322
                      formatter={(val: any) => Number(val) > 0 ? val : ''}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <div className="bg-muted p-4 rounded-full mb-3">
                   <AlertCircle className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm font-medium">Nenhum benefício registrado.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}