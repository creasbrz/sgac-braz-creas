// frontend/src/pages/AdvancedAnalytics.tsx
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { z } from "zod"
import { toast } from "sonner"

// Gráficos (Recharts via Shadcn)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList, Cell
} from "recharts"

// Ícones e UI
import { 
  AlertTriangle, Clock, TrendingUp, FileBarChart, 
  Activity, Briefcase, Calendar, RefreshCw
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

// Shadcn Charts
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"

// PDF Imports
import { PDFDownloadButton } from "@/components/reports/PDFDownloadButton"
import { AnalyticsReportDoc } from "@/components/reports/templates/AnalyticsReportDoc"

// --- SCHEMAS DE VALIDAÇÃO (ZOD) ---
const TrendDataSchema = z.object({
  name: z.string(),
  novos: z.number().default(0),
  fechados: z.number().default(0),
})

const PieDataSchema = z.object({
  name: z.string(),
  value: z.number(),
})

const InsightSchema = z.object({
  type: z.enum(['success', 'warning', 'info']).default('info'),
  title: z.string(),
  description: z.string(),
})

const AdvancedStatsSchema = z.object({
  avgHandlingTime: z.number().default(0),
  totalActive: z.number().default(0),
  trendData: z.array(TrendDataSchema).default([]),
  pieData: z.array(PieDataSchema).default([]),
  insights: z.array(InsightSchema).default([]),
})

const ProductivityItemSchema = z.object({
  name: z.string(),
  value: z.number().default(0),
})

// --- CONFIGURAÇÃO DE GRÁFICOS (Design System) ---
const trendChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-1))", 
  },
  fechados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-2))", 
  },
} satisfies ChartConfig

const productivityChartConfig = {
  value: {
    label: "Intervenções",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

// --- UTILITÁRIOS PUROS ---
function calculateRegression(xs: number[], ys: number[]): number | null {
  if (xs.length < 2) return null
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const diffX = xs[i] - meanX
    num += diffX * (ys[i] - meanY)
    den += diffX ** 2
  }
  if (den === 0) return null
  const m = num / den
  const b = meanY - m * meanX
  return m * (xs[n - 1] + 1) + b
}

// --- COMPONENTE PRINCIPAL ---
export function AdvancedAnalytics() {
  const [periodMonths, setPeriodMonths] = useState<number>(12)

  // 1. Data Fetching
  const statsQuery = useQuery({
    queryKey: ["stats", "advanced", periodMonths],
    queryFn: async () => {
      const { data } = await api.get("/stats/advanced", { params: { months: periodMonths } })
      return AdvancedStatsSchema.parse(data)
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const prodQuery = useQuery({
    queryKey: ["stats", "productivity", periodMonths],
    queryFn: async () => {
      const { data } = await api.get("/stats/productivity", { params: { mode: 'performance', months: periodMonths } })
      return z.array(ProductivityItemSchema).parse(data)
    },
    staleTime: 1000 * 60 * 5,
  })

  // Feedback de erro gracioso
  useEffect(() => {
    if (statsQuery.isError || prodQuery.isError) {
      toast.error("Erro ao sincronizar dados analíticos", {
        description: "Exibindo dados em cache ou estado vazio."
      })
    }
  }, [statsQuery.isError, prodQuery.isError])

  // 2. Data Processing (Memoized)
  const processedData = useMemo(() => {
    const rawData = statsQuery.data || AdvancedStatsSchema.parse({})
    const rawProd = prodQuery.data || []

    // Processamento do Pie Chart (Violações)
    const violationCounts: Record<string, number> = {}
    rawData.pieData.forEach((item) => {
      item.name.split(',').forEach((cat) => {
        const trimmed = cat.trim()
        if (trimmed) violationCounts[trimmed] = (violationCounts[trimmed] || 0) + item.value
      })
    })

    const pieChartData = Object.entries(violationCounts)
      .map(([realName, value], index) => ({
        name: `segment_${index}`,
        realLabel: realName,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))` // Cores cíclicas do tema
      }))
      .sort((a, b) => b.value - a.value)

    // Configuração Dinâmica para Tooltips do Chart
    const dynamicConfig: ChartConfig = { occurrences: { label: "Ocorrências" } }
    pieChartData.forEach(item => {
      dynamicConfig[item.name] = { label: item.realLabel, color: item.fill }
    })

    // Previsão Linear (IA Simples)
    const xs: number[] = []
    const ys: number[] = []
    rawData.trendData.forEach((d, i) => { xs.push(i); ys.push(d.novos) })
    const forecastValue = calculateRegression(xs, ys)

    const totalViolations = pieChartData.reduce((acc, curr) => acc + curr.value, 0)

    // Formatação para Relatório PDF
    const reportData = {
      periodo: periodMonths,
      kpis: {
        tempoMedio: rawData.avgHandlingTime,
        ativosPaefi: rawData.totalActive,
        previsaoNovos: forecastValue
      },
      insights: rawData.insights,
      fluxo: rawData.trendData,
      violacoes: pieChartData.map(p => ({
        name: p.realLabel,
        value: p.value,
        percent: totalViolations > 0 ? (p.value / totalViolations) * 100 : 0
      })),
      produtividade: rawProd
    }

    return {
      kpis: rawData,
      pieChartData,
      violationConfig: dynamicConfig,
      forecast: forecastValue,
      totalViolations,
      productivity: rawProd,
      reportData,
      formattedInsights: rawData.insights.map(i => `${i.title}: ${i.description}`)
    }
  }, [statsQuery.data, prodQuery.data, periodMonths])

  const isLoading = statsQuery.isLoading || prodQuery.isLoading

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-400 mx-auto animate-in fade-in duration-700">
      
      {/* HEADER "GLASS" */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-8 px-6 py-4 bg-background/80 backdrop-blur-md border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Inteligência de Dados
            {statsQuery.isFetching && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise estratégica e preditiva da unidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-45 bg-background border-border/60 shadow-sm h-9">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 Meses</SelectItem>
              <SelectItem value="6">Últimos 6 Meses</SelectItem>
              <SelectItem value="12">Últimos 12 Meses</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="hidden sm:block">
            {statsQuery.data && (
                <PDFDownloadButton 
                    document={<AnalyticsReportDoc data={processedData.reportData} />}
                    fileName={`Relatorio_Sintetico_${periodMonths}M.pdf`}
                    label="Exportar PDF"
                    variant="outline" 
                    size="sm"
                    className="h-9"
                />
            )}
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
           Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <DashboardStatCard 
              title="Tempo Médio Resolução" 
              value={processedData.kpis.avgHandlingTime} 
              description="Dias triagem até desligamento" 
              icon={Clock} 
              variant="default" 
            />
            <DashboardStatCard 
              title="Casos Ativos (PAEFI)" 
              value={processedData.kpis.totalActive} 
              description="Famílias em acompanhamento" 
              icon={Activity} 
              variant="default"
            />
            <DashboardStatCard 
              title="Novos Casos" 
              value={processedData.kpis.trendData.reduce((acc, curr) => acc + curr.novos, 0)} 
              description={`Total no período (${periodMonths}m)`} 
              icon={FileBarChart} 
              variant="default"
            />
             {/* Card de Previsão IA - Gradiente Suave */}
             <Card className="flex flex-col justify-between border-l-4 border-l-primary shadow-sm bg-linear-to-br from-background to-muted/20">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Previsão (IA)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold flex items-baseline gap-1">
                        ~{Math.round(processedData.forecast || 0)}
                        <span className="text-xs font-normal text-muted-foreground">novos casos/mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Tendência linear baseada no histórico.</p>
                </CardContent>
             </Card>
          </>
        )}
      </section>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. GRÁFICO PRINCIPAL (Fluxo) */}
        <Card className="lg:col-span-8 shadow-sm border-border/50 flex flex-col h-125">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        {/* Ícone usando cor do Chart-1 para consistência */}
                        <TrendingUp className="h-5 w-5 text-[hsl(var(--chart-1))]"/> Fluxo de Atendimentos
                    </CardTitle>
                    <CardDescription>Comparativo de entradas vs. saídas</CardDescription>
                </div>
                {!isLoading && (
                    <Badge variant="outline" className="font-mono text-xs">
                        LIVE DATA
                    </Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pb-2">
            {isLoading ? <Skeleton className="w-full h-full rounded-lg" /> : (
                <ChartContainer config={trendChartConfig} className="w-full h-full">
                <LineChart data={processedData.kpis.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={12} 
                        fontSize={12}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={12}
                        stroke="hsl(var(--muted-foreground))"
                        width={30}
                    />
                    <ChartTooltip 
                        content={
                            <ChartTooltipContent 
                                indicator="line" 
                                className="bg-background/95 backdrop-blur border-border/50 shadow-xl" 
                            />
                        } 
                    />
                    <Line 
                        type="monotone" 
                        dataKey="novos" 
                        stroke="var(--color-novos)" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={1500}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="fechados" 
                        stroke="var(--color-fechados)" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={false}
                    />
                    <ChartLegend content={<ChartLegendContent />} className="pt-4" />
                </LineChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. INSIGHTS IA (Lateral) */}
        <div className="lg:col-span-4 flex flex-col h-125">
           <SmartInsightsCard 
             insights={processedData.formattedInsights} 
             isLoading={isLoading} 
             className="h-full border-border/50 shadow-sm"
           />
        </div>

        {/* 3. GRÁFICO DE PIZZA (Violações) */}
        <Card className="lg:col-span-5 shadow-sm border-border/50 h-100 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    {/* Ícone usando cor do Chart-4 (geralmente Amber/Orange) para alerta */}
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]"/> Tipificação de Violações
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
                {isLoading ? <Skeleton className="h-64 w-64 rounded-full" /> : (
                    processedData.pieChartData.length > 0 ? (
                        <ChartContainer config={processedData.violationConfig} className="aspect-square h-full max-h-75">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie 
                                    data={processedData.pieChartData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    innerRadius={70} 
                                    outerRadius={100} 
                                    strokeWidth={2}
                                    stroke="hsl(var(--background))"
                                    paddingAngle={3}
                                >
                                     {processedData.pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                return (
                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                        <tspan x={viewBox.cx} y={viewBox.cy} dy="-0.2em" className="fill-foreground text-3xl font-bold">
                                                            {processedData.totalViolations}
                                                        </tspan>
                                                        <tspan x={viewBox.cx} y={viewBox.cy} dy="1.4em" className="fill-muted-foreground text-xs font-semibold uppercase">
                                                            Ocorrências
                                                        </tspan>
                                                    </text>
                                                )
                                            }
                                        }}
                                    />
                                </Pie>
                                <ChartLegend 
                                    content={<ChartLegendContent nameKey="realLabel" />} 
                                    className="-translate-y-2 flex-wrap gap-2 text-xs" 
                                />
                            </PieChart>
                        </ChartContainer>
                    ) : (
                        <div className="text-center text-muted-foreground text-sm">Nenhum dado disponível.</div>
                    )
                )}
            </CardContent>
        </Card>

        {/* 4. GRÁFICO DE BARRAS (Produtividade) - Versão Compacta Corrigida */}
        <Card className="lg:col-span-7 shadow-sm border-border/50 h-100 flex flex-col">
             <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    {/* Ícone usando cor Primary (Azul) */}
                    <Briefcase className="h-4 w-4 text-primary"/> Produtividade Técnica
                </CardTitle>
                <CardDescription>Intervenções registradas por técnico</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-4"> 
                 {isLoading ? <Skeleton className="w-full h-full" /> : (
                    <ChartContainer config={productivityChartConfig} className="w-full h-full">
                        <BarChart 
                            accessibilityLayer 
                            data={processedData.productivity} 
                            layout="vertical" 
                            barCategoryGap="15%" 
                            margin={{ left: -10, right: 40, top: 0, bottom: 0 }}
                        >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tickLine={false} 
                                axisLine={false}
                                width={110}
                                className="text-[11px] font-medium"
                                interval={0} 
                            />
                            <XAxis type="number" hide />
                            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                            
                            <Bar 
                                dataKey="value" 
                                fill="var(--color-value)" 
                                radius={[0, 3, 3, 0]} 
                                barSize={16} 
                                className="opacity-90 hover:opacity-100 transition-opacity"
                            >
                                <LabelList 
                                    dataKey="value" 
                                    position="right" 
                                    className="fill-foreground font-bold text-[10px]"
                                    formatter={(value: any) => (Number(value) > 0 ? value : "")}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                 )}
            </CardContent>
        </Card>

      </div>
    </div>
  )
}