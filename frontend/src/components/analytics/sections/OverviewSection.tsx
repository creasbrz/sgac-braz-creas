import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList
} from 'recharts'
import { 
  TrendingUp, AlertTriangle, PieChart as PieIcon, 
  Activity, UserPlus, CheckCircle2} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart"

import type { ObservatoryData } from '@/utils/pdfGenerator'

// --- UTILS ---

// --- CHART CONFIGURATIONS ---
const evolutionChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-1))", // Blue/Primary
  },
  desligados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-2))", // Emerald/Green
  },
} satisfies ChartConfig

const urgencyChartConfig = {
  value: {
    label: "Quantidade",
    // Cores serão definidas dinamicamente no render
  }
} satisfies ChartConfig

const violationChartConfig = {
  value: {
    label: "Ocorrências",
  }
} satisfies ChartConfig

export function OverviewSection({ data }: { data: ObservatoryData }) {
  
  // Helper para cor de urgência (mantendo lógica de negócio)
  const getUrgencyColor = (weight: number) => {
    if (weight >= 4) return 'hsl(var(--destructive))'; // Red
    if (weight === 3) return 'hsl(var(--chart-4))'; // Orange
    if (weight === 2) return 'hsl(var(--chart-3))'; // Yellow/Amber
    return 'hsl(var(--chart-2))'; // Green
  }

  // Cálculos Básicos
  const totalNovos = useMemo(() => data.evolutionData.reduce((acc, c) => acc + c.novos, 0), [data])
  const totalDesligados = useMemo(() => data.efficiencyData.totalClosed, [data])
  const totalRiscoAlto = useMemo(() => data.urgencyData.filter((u) => u.weight >= 3).reduce((acc, c) => acc + c.value, 0), [data])
  
  // Processamento de Violações (Split & Count)
  const pieData = useMemo(() => {
    const rawCounts: Record<string, number> = {}

    data.violationData.forEach((item) => {
      const categories = item.name.split(',').map(s => s.trim())
      categories.forEach(cat => {
        if (cat) rawCounts[cat] = (rawCounts[cat] || 0) + item.value
      })
    })

    const processedData = Object.entries(rawCounts)
      .map(([name, value], index) => ({ 
        name, 
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))` // Cores cíclicas do tema
      }))
      .sort((a, b) => b.value - a.value)
    
    if (processedData.length <= 5) return processedData
    
    const top5 = processedData.slice(0, 5)
    const outrosVal = processedData.slice(5).reduce((acc, curr) => acc + curr.value, 0)
    
    return [...top5, { name: 'Outros', value: outrosVal, fill: 'hsl(var(--muted))' }]
  }, [data])

  const principalDemanda = pieData.length > 0 ? pieData[0].name : 'N/A'
  const totalViolations = pieData.reduce((acc, curr) => acc + curr.value, 0)

  // Dados de Urgência com Cores
  const urgencyData = useMemo(() => 
    data.urgencyData.map(d => ({
      ...d,
      fill: getUrgencyColor(d.weight)
    })), 
  [data.urgencyData])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard 
          title="Novos Casos (6 Meses)" 
          value={totalNovos} 
          icon={UserPlus} 
          variant="blue" 
        />
        <DashboardStatCard 
          title="Casos Desligados" 
          value={totalDesligados} 
          icon={CheckCircle2} 
          variant="green" 
        />
        <DashboardStatCard 
          title="Alto Risco Ativo" 
          value={totalRiscoAlto} 
          icon={AlertTriangle} 
          variant="rose" 
        />
        <DashboardStatCard 
          title="Principal Demanda" 
          value={principalDemanda} 
          icon={Activity} 
          variant="purple" 
          description="Violação mais recorrente"
          // Pequeno ajuste para texto longo se necessário
          className="text-xl" 
        />
      </section>

      {/* 2. GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fluxo de Atendimento (Bar Chart) */}
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary"/> Fluxo de Atendimento
            </CardTitle>
            <CardDescription>Comparativo mensal de entradas e saídas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={evolutionChartConfig} className="aspect-[16/9] w-full max-h-[350px]">
              <BarChart accessibilityLayer data={data.evolutionData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={10} 
                  fontSize={12}
                />
                <ChartTooltip cursor={{fill: 'hsl(var(--muted)/0.2)'}} content={<ChartTooltipContent indicator="dashed" />} />
                <ChartLegend content={<ChartLegendContent />} />
                
                <Bar dataKey="novos" fill="var(--color-novos)" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="desligados" fill="var(--color-desligados)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Matriz de Risco (Vertical Bar) */}
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-500"/> Matriz de Risco
            </CardTitle>
            <CardDescription>Distribuição dos casos ativos por gravidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={urgencyChartConfig} className="aspect-[16/9] w-full max-h-[350px]">
              <BarChart accessibilityLayer data={urgencyData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12}
                  tick={{fontWeight: 500}} 
                />
                <XAxis type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    className="fill-foreground font-bold text-xs" 
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Tipificação das Violações (Donut) */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieIcon className="h-4 w-4 text-purple-500"/> Tipificação das Violações
            </CardTitle>
            <CardDescription>Principais naturezas de violação identificadas (Contagem individual).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ChartContainer config={violationChartConfig} className="mx-auto aspect-square max-h-[350px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    innerRadius={60} 
                    strokeWidth={4}
                  >
                    <Label 
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                {totalViolations}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                OCORRÊNCIAS
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  <ChartLegend 
                    content={<ChartLegendContent nameKey="name" />} 
                    className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" 
                  />
                </PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}