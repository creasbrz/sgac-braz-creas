// frontend/src/components/analytics/sections/PerformanceSection.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts'
import { Users, Gift, Clock, Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ObservatoryData } from '@/utils/pdfGenerator'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- COMPONENTES AUXILIARES ---

// Card de Métrica (KPI) - Com tratamento para valor vazio
function MetricCard({ title, value, subtext, icon: Icon, colorClass, borderColor }: any) {
  // Se o valor for null/undefined, mostra traço. Se for 0, mostra 0.
  const displayValue = (value !== null && value !== undefined) ? value : '--'

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow h-full border-t-4", borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
          <Icon className={cn("h-4 w-4", colorClass)} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold", colorClass)}>{displayValue}</span>
          {subtext && <span className="text-xs text-muted-foreground font-medium">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

// Tooltip Customizado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border shadow-md rounded-lg p-2 text-popover-foreground text-xs">
        <p className="font-semibold mb-1">{label}</p>
        <p>Qtd: <span className="font-bold">{payload[0].value}</span></p>
      </div>
    )
  }
  return null
}

// --- COMPONENTE PRINCIPAL ---

export function PerformanceSection({ data }: { data: ObservatoryData }) {
  
  // [CORREÇÃO] Garante que não quebre se benefitsData for undefined
  const benefits = data.benefitsData || []
  const sortedBenefits = [...benefits].sort((a, b) => b.value - a.value).slice(0, 5)

  // [CORREÇÃO] Extração segura dos dados de eficiência
  const efficiency = data.efficiencyData || {}
  
  // Log para debug (abra o console do navegador F12 se continuar zerado)
  // console.log('Dados de Eficiência:', efficiency)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Indicadores de Eficiência (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard 
          title="Tempo de Acompanhamento" 
          value={efficiency.avgPermanence ?? 0} // Fallback para 0 se nulo
          subtext="dias (média)"
          icon={Clock} 
          colorClass="text-blue-600" 
          borderColor="border-t-blue-500"
        />
        <MetricCard 
          title="Tempo de Espera" 
          value={efficiency.avgWaitTime ?? 0} // Fallback para 0 se nulo
          subtext="dias até 1º atendimento"
          icon={Activity} 
          colorClass="text-amber-600" 
          borderColor="border-t-amber-500"
        />
        <MetricCard 
          title="Total Desligamentos" 
          value={efficiency.totalClosed ?? 0} // Fallback para 0 se nulo
          subtext="casos finalizados"
          icon={CheckCircle} 
          colorClass="text-emerald-600" 
          borderColor="border-t-emerald-500"
        />
      </div>

      {/* 2. Métricas de Volume e Benefícios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card: Grupos e Oficinas */}
        <Card className="lg:col-span-1 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500"/> Atividades Coletivas
            </CardTitle>
            <CardDescription>Engajamento em grupos e oficinas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-6">
             <div className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-900/10 rounded-lg border border-pink-100 dark:border-pink-900/30">
                <div>
                   <p className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider">Participantes</p>
                   <p className="text-3xl font-bold text-pink-600 dark:text-pink-300 mt-1">
                     {data.collectiveData?.totalParticipants ?? 0}
                   </p>
                </div>
                <Users className="h-8 w-8 text-pink-300 dark:text-pink-800 opacity-50" />
             </div>
             
             <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Média por Grupo</p>
                   <p className="text-2xl font-bold text-foreground mt-1">
                     {data.collectiveData?.avgAttendance ?? 0} <span className="text-sm font-normal text-muted-foreground">pessoas</span>
                   </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground opacity-20" />
             </div>
          </CardContent>
        </Card>

        {/* Card: Benefícios Concedidos (Gráfico Horizontal) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-500"/> Concessão de Benefícios
            </CardTitle>
            <CardDescription>Principais benefícios entregues no período.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {sortedBenefits.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={sortedBenefits} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={110} 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                    tickFormatter={(val) => val.length > 18 ? `${val.substring(0, 18)}...` : val}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                    <LabelList dataKey="value" position="right" fontSize={11} fontWeight="bold" fill="hsl(var(--foreground))" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum benefício registrado no período.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}