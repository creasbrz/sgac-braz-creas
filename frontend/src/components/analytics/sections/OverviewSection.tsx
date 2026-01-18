// frontend/src/components/analytics/sections/OverviewSection.tsx
import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList, Cell
} from 'recharts'
import { 
  TrendingUp, AlertTriangle, PieChart as PieIcon, 
  Activity, UserPlus, CheckCircle2 
} from 'lucide-react'

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

import type { ObservatoryData } from '@/types/case'

// --- CONFIGURAÇÕES ESTÁTICAS ---
const evolutionChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-2))", 
  },
  desligados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-1))", 
  },
} satisfies ChartConfig

const urgencyChartConfig = {
  value: {
    label: "Quantidade",
  }
} satisfies ChartConfig

export function OverviewSection({ data }: { data: ObservatoryData }) {
  
  // --- LÓGICA DE NEGÓCIO ---
  const getUrgencyColor = (weight: number) => {
    if (weight >= 4) return 'hsl(var(--destructive))'; 
    if (weight === 3) return 'hsl(var(--chart-5))'; // Laranja
    if (weight === 2) return 'hsl(var(--chart-4))'; // Amarelo
    return 'hsl(var(--chart-2))'; // Verde
  }

  const totalNovos = useMemo(() => data.evolutionData.reduce((acc, c) => acc + c.novos, 0), [data])
  const totalDesligados = useMemo(() => data.efficiencyData.totalClosed, [data])
  const totalRiscoAlto = useMemo(() => data.urgencyData.filter((u) => u.weight >= 3).reduce((acc, c) => acc + c.value, 0), [data])
  
  // Processamento Dinâmico de Violações
  const { pieData, violationConfig, principalDemanda } = useMemo(() => {
    const rawCounts: Record<string, number> = {}

    // 1. Contagem
    data.violationData.forEach((item) => {
      const categories = item.name.split(',').map(s => s.trim())
      categories.forEach(cat => {
        if (cat) rawCounts[cat] = (rawCounts[cat] || 0) + item.value
      })
    })

    // 2. Transformação em Array
    let processedData = Object.entries(rawCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // 3. Lógica de Agrupamento
    if (processedData.length > 10) {
        const top9 = processedData.slice(0, 9)
        const outrosVal = processedData.slice(9).reduce((acc, curr) => acc + curr.value, 0)
        
        const existingOutros = top9.find(i => i.name.toLowerCase() === 'outros')
        if (existingOutros) {
            existingOutros.value += outrosVal
            processedData = top9
        } else {
            processedData = [...top9, { name: 'Outros', value: outrosVal }]
        }
    }

    // 4. Geração Dinâmica da Configuração
    const dynamicConfig: ChartConfig = {
        occurrences: { label: "Ocorrências" }
    }

    const finalData = processedData.map((item, index) => {
        const color = item.name.toLowerCase() === 'outros' 
            ? "hsl(var(--muted-foreground))" 
            : `hsl(var(--chart-${(index % 5) + 1}))`
        
        dynamicConfig[item.name] = {
            label: item.name,
            color: color
        }

        return { ...item, fill: color }
    })

    return {
        pieData: finalData,
        violationConfig: dynamicConfig,
        principalDemanda: finalData.length > 0 ? finalData[0].name : 'N/A'
    }
  }, [data])

  const totalViolations = pieData.reduce((acc, curr) => acc + curr.value, 0)

  const urgencyData = useMemo(() => 
    data.urgencyData.map(d => ({
      ...d,
      fill: getUrgencyColor(d.weight)
    })), 
  [data.urgencyData])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* 1. KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Novos Casos (6 Meses)" value={totalNovos} icon={UserPlus} variant="blue" />
        <DashboardStatCard title="Casos Desligados" value={totalDesligados} icon={CheckCircle2} variant="green" />
        <DashboardStatCard title="Alto Risco Ativo" value={totalRiscoAlto} icon={AlertTriangle} variant="rose" />
        <DashboardStatCard title="Principal Demanda" value={principalDemanda} icon={Activity} variant="purple" description="Violação mais recorrente" className="text-xl" />
      </section>

      {/* 2. CHARTS GRID (5 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* EVOLUÇÃO (Bar Chart) - 60% Width */}
        <Card className="lg:col-span-3 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary"/> Fluxo de Atendimento
            </CardTitle>
            <CardDescription>Entradas vs. Saídas nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            {/* [CORREÇÃO] Altura fixa (h-[350px]) em vez de min-h */}
            <div className="h-[350px] w-full">
                <ChartContainer config={evolutionChartConfig} className="h-full w-full">
                  <BarChart accessibilityLayer data={data.evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} className="text-muted-foreground font-medium" padding={{ left: 10, right: 10 }} />
                      <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} content={<ChartTooltipContent indicator="dashed" className="w-[180px]" />} />
                      
                      {/* Legenda com Render Prop */}
                      <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
                      
                      <Bar dataKey="novos" fill="var(--color-novos)" radius={[4, 4, 0, 0]} barSize={28} />
                      <Bar dataKey="desligados" fill="var(--color-desligados)" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* MATRIZ DE RISCO - 40% Width */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-500"/> Matriz de Risco
            </CardTitle>
            <CardDescription>Casos ativos por gravidade</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {/* [CORREÇÃO] Altura fixa (h-[350px]) */}
            <div className="h-[350px] w-full">
                <ChartContainer config={urgencyChartConfig} className="h-full w-full">
                  <BarChart accessibilityLayer data={urgencyData} layout="vertical" margin={{ left: 0, right: 40 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={140}  
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={11} 
                        interval={0} 
                        className="text-muted-foreground font-medium"
                      />

                      <XAxis type="number" hide />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                          {urgencyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList 
                            dataKey="value" 
                            position="right" 
                            className="fill-foreground font-bold text-sm" 
                            formatter={(val: any) => val > 0 ? val : ''} 
                          />
                      </Bar>
                  </BarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* TIPIFICAÇÃO (Donut Chart) */}
        <Card className="lg:col-span-5 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieIcon className="h-4 w-4 text-purple-500"/> Natureza das Violações
            </CardTitle>
            <CardDescription>Distribuição das ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            {/* [CORREÇÃO] Altura fixa e remoção de classes conflitantes */}
            <div className="h-[350px] w-full flex justify-center">
              <ChartContainer config={violationConfig} className="h-full w-full max-w-[500px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    innerRadius={80} 
                    outerRadius={100} 
                    strokeWidth={3}
                    stroke="hsl(var(--card))"
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                dy="-1.0em" 
                                className="fill-foreground text-4xl font-bold tracking-tight"
                              >
                                {totalViolations}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                dy="-0.5em" 
                                className="fill-muted-foreground text-xs font-semibold uppercase tracking-wider"
                              >
                                Ocorrências
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  
                  <ChartLegend 
                    content={({ payload }) => <ChartLegendContent payload={payload} nameKey="name" />} 
                    className="-translate-y-2 flex-wrap gap-4 [&>*]:basis-auto" 
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