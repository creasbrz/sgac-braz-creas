// frontend/src/components/analytics/sections/OverviewSection.tsx
import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList, Cell
} from 'recharts'
import { 
  TrendingUp, AlertTriangle, PieChart as PieIcon, 
  Activity, UserPlus, CheckCircle2, LucideIcon, BarChart3
} from 'lucide-react'
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

// --- LOCAL COMPONENTS ---
interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'blue' | 'green' | 'rose' | 'purple' | 'amber'
}

const StatCard = ({ title, value, icon: Icon, description, variant = 'blue' }: StatCardProps) => {
  const themes = {
    blue: {
      border: "border-status-info-border",
      bg: "bg-status-info-bg",
      text: "text-status-info-fg",
      stripe: "bg-status-info-fg"
    },
    green: {
      border: "border-status-success-border",
      bg: "bg-status-success-bg",
      text: "text-status-success-fg",
      stripe: "bg-status-success-fg"
    },
    rose: {
      border: "border-status-error-border",
      bg: "bg-status-error-bg",
      text: "text-status-error-fg",
      stripe: "bg-status-error-fg"
    },
    purple: {
      border: "border-status-ai-border",
      bg: "bg-status-ai-bg",
      text: "text-status-ai-fg",
      stripe: "bg-status-ai-fg"
    },
    amber: {
      border: "border-status-warning-border",
      bg: "bg-status-warning-bg",
      text: "text-status-warning-fg",
      stripe: "bg-status-warning-fg"
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

// --- CONFIGURAÇÕES DE CHART ---
const evolutionChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-1))", 
  },
  desligados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-2))", 
  },
} satisfies ChartConfig

const urgencyChartConfig = {
  value: {
    label: "Quantidade",
    color: "hsl(var(--primary))"
  }
} satisfies ChartConfig

export function OverviewSection({ data }: { data: ObservatoryData }) {
  
  // --- 1. PROCESSAMENTO DE DADOS ---
  
  const kpis = useMemo(() => ({
    novos: data.evolutionData.reduce((acc, c) => acc + c.novos, 0),
    desligados: data.efficiencyData.totalClosed,
    riscoAlto: data.urgencyData.filter((u) => u.weight >= 3).reduce((acc, c) => acc + c.value, 0)
  }), [data])

  const getUrgencyColor = (weight: number) => {
    if (weight >= 4) return 'hsl(var(--destructive))'; // Crítico
    if (weight === 3) return 'hsl(var(--chart-5))';    // Alto (Amber)
    if (weight === 2) return 'hsl(var(--chart-4))';    // Médio (Yellow)
    return 'hsl(var(--chart-2))';                      // Baixo (Green)
  }

  // --- Lógica Refinada para o Gráfico de Pizza (Violações) ---
  const { pieData, violationConfig, principalDemanda, totalViolations } = useMemo(() => {
    const rawCounts: Record<string, number> = {}

    data.violationData.forEach((item) => {
      const categories = item.name.split(',').map(s => s.trim())
      categories.forEach(cat => {
        if (cat) rawCounts[cat] = (rawCounts[cat] || 0) + item.value
      })
    })

    let processedData = Object.entries(rawCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    if (processedData.length > 6) {
        const top5 = processedData.slice(0, 6)
        const outrosVal = processedData.slice(6).reduce((acc, curr) => acc + curr.value, 0)
        processedData = [...top5, { name: 'Outros', value: outrosVal }]
    }

    const dynamicConfig: ChartConfig = {
        occurrences: { label: "Ocorrências" }
    }

    const finalData = processedData.map((item, index) => {
      const colorVar = item.name === 'Outros' ? 'muted-foreground' : `chart-${(index % 5) + 1}`
      const color = `hsl(var(--${colorVar}))`
      
      dynamicConfig[item.name] = { 
        label: item.name,
        color: color 
      }
      return { ...item, fill: color }
    })

    return {
        pieData: finalData,
        violationConfig: dynamicConfig,
        principalDemanda: finalData.length > 0 ? finalData[0].name : 'N/A',
        totalViolations: finalData.reduce((acc, curr) => acc + curr.value, 0)
    }
  }, [data])

  const urgencyData = useMemo(() => 
    data.urgencyData.map(d => ({ 
      ...d, 
      fill: getUrgencyColor(d.weight) 
    })), 
  [data])

  // Helper para Empty State
  const EmptyState = ({ message }: { message: string }) => (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
      <div className="p-3 bg-muted/20 rounded-full">
        <BarChart3 className="h-6 w-6 opacity-50" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )

  // --- 2. RENDERIZAÇÃO ---

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* KPIS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Novos Casos" 
          description="Últimos 6 meses"
          value={kpis.novos} 
          icon={UserPlus} 
          variant="blue" 
        />
        <StatCard 
          title="Desligamentos" 
          description="Casos concluídos"
          value={kpis.desligados} 
          icon={CheckCircle2} 
          variant="green" 
        />
        <StatCard 
          title="Risco Elevado" 
          description="Prioridade máxima"
          value={kpis.riscoAlto} 
          icon={AlertTriangle} 
          variant="rose" 
        />
        <StatCard 
          title="Demanda Principal" 
          value={principalDemanda} 
          icon={Activity} 
          variant="purple" 
          description="Maior incidência" 
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* FLUXO DE ATENDIMENTO */}
        <Card className="lg:col-span-3 flex flex-col shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-4 w-4 text-primary"/> Fluxo de Atendimento
            </CardTitle>
            <CardDescription>Comparativo de entradas e saídas mensais</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 flex-1 min-h-87.5">
            {data.evolutionData.length > 0 ? (
                <div className="h-87.5 w-full">
                    <ChartContainer config={evolutionChartConfig} className="h-full w-full">
                    <BarChart accessibilityLayer data={data.evolutionData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.5} />
                        <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={false} 
                            tickMargin={10} 
                            fontSize={12} 
                            className="text-muted-foreground font-medium" 
                        />
                        {/* Tooltip melhorado e sem legendas fixas */}
                        <ChartTooltip 
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }} 
                            content={<ChartTooltipContent className="min-w-37.5" />} 
                        />
                        
                        <Bar dataKey="novos" fill="var(--color-novos)" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="desligados" fill="var(--color-desligados)" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                    </ChartContainer>
                </div>
            ) : (
                <EmptyState message="Sem dados de fluxo" />
            )}
          </CardContent>
        </Card>

        {/* MATRIZ DE RISCO */}
        <Card className="lg:col-span-2 flex flex-col shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-status-warning-bg rounded-md">
                 <AlertTriangle className="h-4 w-4 text-status-warning-fg"/> 
              </div>
              Matriz de Risco
            </CardTitle>
            <CardDescription>Volume de casos por gravidade</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-87.5">
            {urgencyData.length > 0 ? (
                <div className="h-87.5 w-full">
                    <ChartContainer config={urgencyChartConfig} className="h-full w-full">
                    <BarChart 
                        accessibilityLayer 
                        data={urgencyData} 
                        layout="vertical" 
                        margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                        barCategoryGap="20%"
                    >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tickLine={false} 
                            axisLine={false} 
                            fontSize={11} 
                            className="text-muted-foreground font-medium"
                            tickFormatter={(val) => val.length > 15 ? `${val.slice(0, 15)}...` : val}
                        />
                        <XAxis type="number" hide />
                        {/* Tooltip ativado, legenda fixa removida */}
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {urgencyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList 
                                dataKey="value" 
                                position="right" 
                                className="fill-foreground font-bold text-xs" 
                                offset={8}
                            />
                        </Bar>
                    </BarChart>
                    </ChartContainer>
                </div>
            ) : (
                <EmptyState message="Sem dados de risco" />
            )}
          </CardContent>
        </Card>

       {/* NATUREZA DAS VIOLAÇÕES */}
        <Card className="lg:col-span-5 flex flex-col shadow-sm border-border/60">
          <CardHeader className="items-center pb-0 border-b border-border/40 bg-muted/5">
            <div className="flex flex-col items-center gap-1.5 py-2">
                <div className="p-2 bg-status-ai-bg rounded-full border border-status-ai-border">
                    <PieIcon className="h-5 w-5 text-status-ai-fg"/>
                </div>
                <CardTitle className="text-lg font-bold">Natureza das Violações</CardTitle>
                <CardDescription>Distribuição tipificada das ocorrências registradas</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 pb-4 pt-6 min-h-100">
            {pieData.length > 0 ? (
                <ChartContainer config={violationConfig} className="mx-auto aspect-square max-h-87.5 w-full">
                    <PieChart>
                        {/* Tooltip Aprimorado */}
                        <ChartTooltip cursor={false} content={<ChartTooltipContent className="min-w-37.5" />} />
                        <Pie 
                            data={pieData} 
                            dataKey="value" 
                            nameKey="name" 
                            innerRadius={85} 
                            outerRadius={120} 
                            strokeWidth={5}
                            stroke="hsl(var(--card))"
                            paddingAngle={2}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text 
                                                x={viewBox.cx} 
                                                y={viewBox.cy} 
                                                textAnchor="middle" 
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-4xl font-bold tracking-tighter"
                                                >
                                                    {totalViolations}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground text-xs font-semibold uppercase tracking-widest"
                                                >
                                                    Ocorrências
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                        {/* Legendas Fixas Removidas - Apenas Tooltip interativo */}
                    </PieChart>
                </ChartContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <PieIcon className="h-8 w-8 opacity-20" />
                    <span>Sem dados de violações para exibir.</span>
                </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}