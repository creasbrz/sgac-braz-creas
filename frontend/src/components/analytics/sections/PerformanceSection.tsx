// frontend/src/components/analytics/sections/PerformanceSection.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { Users, Gift, Clock, Activity, CheckCircle, AlertCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart"

// [CORREÇÃO] Importando do local correto dos tipos (SSoT)
import type { ObservatoryData } from '@/types/case'

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
        <DashboardStatCard 
          title="Tempo de Acompanhamento" 
          value={efficiency.avgPermanence ?? 0} 
          description="dias (média)"
          icon={Clock} 
          variant="blue" 
        />
        <DashboardStatCard 
          title="Tempo de Espera" 
          value={efficiency.avgWaitTime ?? 0} 
          description="dias até 1º atendimento"
          icon={Activity} 
          variant="amber" 
        />
        <DashboardStatCard 
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
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500"/> Atividades Coletivas
            </CardTitle>
            <CardDescription>Engajamento em grupos e oficinas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-4">
             {/* Sub-metric 1: Total Participantes */}
             <div className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/30">
                <div>
                   <p className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider">Participantes</p>
                   <p className="text-3xl font-bold text-pink-600 dark:text-pink-300 mt-1 tabular-nums">
                     {totalParticipants}
                   </p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-white/5 rounded-full">
                   <Users className="h-6 w-6 text-pink-400 dark:text-pink-600" />
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
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-500"/> Concessão de Benefícios
            </CardTitle>
            <CardDescription>Principais benefícios entregues no período.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {sortedBenefits.length > 0 ? (
              <ChartContainer config={benefitsChartConfig} className="w-full h-full">
                <BarChart 
                  accessibilityLayer
                  data={sortedBenefits} 
                  layout="vertical" 
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                    // Truncate long names to keep layout clean
                    tickFormatter={(val) => val.length > 18 ? `${val.substring(0, 18)}...` : val}
                  />
                  <ChartTooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }}
                    content={<ChartTooltipContent indicator="dashed" />} 
                  />
                  <Bar 
                    dataKey="value" 
                    fill="var(--color-value)" 
                    radius={[0, 4, 4, 0]} 
                    barSize={28}
                  >
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      className="fill-foreground font-bold text-xs" 
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