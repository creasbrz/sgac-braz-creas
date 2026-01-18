// frontend/src/pages/AdvancedAnalytics.tsx
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"

// Gráficos (Recharts via Shadcn Charts)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList, Cell
} from "recharts"

// Ícones e UI
import { 
  AlertTriangle, Clock, TrendingUp, FileBarChart, 
  Activity, Briefcase, Calendar
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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
import type { AnalyticsReportData } from "@/types/case"

// --- CONFIGURAÇÃO DE GRÁFICOS ESTÁTICOS ---

const trendChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-2))", // Azul/Primary
  },
  fechados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-1))", // Verde/Secondary
  },
} satisfies ChartConfig

const productivityChartConfig = {
  value: {
    label: "Intervenções",
    color: "hsl(var(--chart-3))", // Roxo
  },
} satisfies ChartConfig

// --- INTERFACES ---
interface TrendData { 
  name: string; 
  novos: number; 
  fechados: number; 
  [key: string]: any 
}

interface PieData { 
  name: string; 
  value: number; 
  fill?: string;
  realLabel?: string;
}

interface Insight { 
  type: 'success' | 'warning' | 'info'; 
  title: string; 
  description: string 
}

interface ProductivityItem { 
  name: string; 
  value: number; 
}

// --- UTILITÁRIOS ---
function linearRegressionForecast(xs: number[], ys: number[]): number | null {
  if (xs.length < 2) return null
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null
  const m = num / den
  const b = meanY - m * meanX
  const nextX = xs[n - 1] + 1
  return m * nextX + b
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-1">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
           <div className="h-8 w-64 bg-muted rounded-md" />
           <div className="h-4 w-96 bg-muted rounded-md" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-32 rounded-xl bg-muted/20 border border-border/50" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px] rounded-xl bg-muted/10 border border-border/50" />
        <div className="h-[400px] rounded-xl bg-muted/10 border border-border/50" />
      </div>
    </div>
  )
}

export function AdvancedAnalytics() {
  const [periodMonths, setPeriodMonths] = useState<number>(12)
  
  // 1. Query Principal
  const { data: dataRaw, isLoading, isError } = useQuery({
    queryKey: ["stats", "advanced", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/advanced", { params: { months: periodMonths } })
        return res.data
      } catch (error) {
        console.warn("API Offline: Usando fallback.")
        return { avgHandlingTime: 45, totalActive: 128, trendData: [], pieData: [], insights: [] }
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Query Secundária (Produtividade)
  const { data: productivityRaw } = useQuery<ProductivityItem[]>({
    queryKey: ["stats", "productivity", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/productivity", { params: { mode: 'performance', months: periodMonths } })
        return res.data
      } catch { return [] }
    }
  })

  // 3. Processamento de Dados (Memo)
  const data = useMemo(() => {
    const rawPieData = (Array.isArray(dataRaw?.pieData) ? dataRaw.pieData : []) as PieData[]
    const violationCounts: Record<string, number> = {}

    // Agrupamento
    rawPieData.forEach((item: any) => {
      const categories = item.name.split(',').map((s: string) => s.trim())
      categories.forEach((cat: string) => {
        if (cat) violationCounts[cat] = (violationCounts[cat] || 0) + item.value
      })
    })

    const dynamicViolationConfig: ChartConfig = {
      occurrences: { label: "Ocorrências" },
    }

    const processedPieData = Object.entries(violationCounts)
      .map(([realName, value], index) => {
        const color = `hsl(var(--chart-${(index % 5) + 1}))`
        const safeKey = `segment_${index}` // Chave segura para o config do gráfico
        
        // Adiciona ao config dinamicamente
        dynamicViolationConfig[safeKey] = {
          label: realName,
          color: color
        }

        return { 
          name: safeKey, // Usa a chave segura para o gráfico
          realLabel: realName, // Usa o nome real para tooltip/legenda
          value, 
          fill: color 
        }
      })
      .sort((a, b) => b.value - a.value)

    return {
      avgHandlingTime: dataRaw?.avgHandlingTime || 0,
      totalActive: dataRaw?.totalActive || 0,
      trendData: (Array.isArray(dataRaw?.trendData) ? dataRaw.trendData : []) as TrendData[],
      pieData: processedPieData,
      violationConfig: dynamicViolationConfig, 
      insights: (Array.isArray(dataRaw?.insights) ? dataRaw.insights : []) as Insight[]
    }
  }, [dataRaw])

  const productivity = useMemo(() => Array.isArray(productivityRaw) ? productivityRaw : [], [productivityRaw])

  // 4. Métricas Derivadas e Previsão
  const forecast = useMemo(() => {
    const xs: number[] = [], ys: number[] = []
    data.trendData.forEach((d, i) => { xs.push(i); ys.push(d.novos) })
    return linearRegressionForecast(xs, ys)
  }, [data.trendData])

  const totalViolations = useMemo(() => data.pieData.reduce((acc, curr) => acc + curr.value, 0), [data.pieData])

  const formattedInsights = useMemo(() => 
    data.insights.map(i => `${i.title}: ${i.description}`), 
  [data.insights])

  // Preparação de dados para o PDF
  const reportData: AnalyticsReportData | null = useMemo(() => {
    if (!dataRaw) return null;
    
    return {
        periodo: periodMonths,
        kpis: {
        tempoMedio: data.avgHandlingTime,
        ativosPaefi: data.totalActive,
        previsaoNovos: forecast
        },
        insights: data.insights,
        fluxo: data.trendData.map(d => ({ name: d.name, novos: d.novos, fechados: d.fechados })),
        violacoes: data.pieData.map(p => ({ 
        name: p.realLabel || p.name, 
        value: p.value,
        percent: totalViolations > 0 ? (p.value / totalViolations) * 100 : 0
        })),
        produtividade: productivity.map(p => ({ name: p.name, value: p.value }))
    }
  }, [data, productivity, periodMonths, forecast, totalViolations, dataRaw]);

  if (isLoading) return <AnalyticsSkeleton />
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground">Falha na conexão</h3>
        <p className="text-muted-foreground mb-4">Não foi possível carregar os dados analíticos.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* HEADER DE CONTROLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inteligência de Dados</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
             <Activity className="w-4 h-4" /> Monitoramento estratégico e preditivo da unidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Controls Container */}
          <div className="flex items-center gap-2 p-1 bg-background border rounded-lg shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
            <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
              <SelectTrigger className="w-[160px] border-0 focus:ring-0 shadow-none h-9 bg-transparent font-medium text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="3">Últimos 3 Meses</SelectItem>
                <SelectItem value="6">Últimos 6 Meses</SelectItem>
                <SelectItem value="12">Últimos 12 Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {reportData && (
            <PDFDownloadButton 
                document={<AnalyticsReportDoc data={reportData} />}
                fileName={`Report_Inteligencia_${periodMonths}M_${format(new Date(), 'yyyyMMdd')}.pdf`}
                label="Exportar PDF"
                variant="default" 
                size="sm"
            />
          )}
        </div>
      </div>

      {/* ÁREA DE EXIBIÇÃO */}
      <div className="space-y-6">
        
        {/* 1. KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardStatCard 
            title="Tempo Médio de Resolução" 
            value={data.avgHandlingTime} 
            description="Dias desde a triagem até o desligamento" 
            icon={Clock} 
            variant="blue" 
            index={0}
          />
          <DashboardStatCard 
            title="Casos Ativos (PAEFI)" 
            value={data.totalActive} 
            description="Famílias em acompanhamento contínuo" 
            icon={FileBarChart} 
            variant="purple" 
            index={1}
          />
          <DashboardStatCard 
            title="Novos Casos (Período)" 
            value={data.trendData.reduce((acc, curr) => acc + curr.novos, 0)} 
            description={`Entradas nos últimos ${periodMonths} meses`} 
            icon={TrendingUp} 
            variant="green" 
            index={2}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 2. GRÁFICO DE TENDÊNCIA (Linha) */}
          <Card className="lg:col-span-2 shadow-sm border-border/60 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary"/> Fluxo de Atendimentos
              </CardTitle>
              <CardDescription>Evolução de entradas e saídas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
              <ChartContainer config={trendChartConfig} className="h-[350px] w-full">
                  <LineChart data={data.trendData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                    <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={12} 
                        fontSize={12} 
                        stroke="hsl(var(--muted-foreground))"
                        padding={{ left: 20, right: 20 }}
                    />
                    <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={12} 
                        stroke="hsl(var(--muted-foreground))"
                        width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" className="w-48" />} />
                    
                    <ChartLegend content={<ChartLegendContent payload={[]} />} />
                    
                    {/* CORREÇÃO: Removido 'dot={...}' e usado 'dot={false}' para visual limpo */}
                    <Line 
                        type="monotone" 
                        dataKey="novos" 
                        stroke="var(--color-novos)" 
                        strokeWidth={3} 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-novos)" }} 
                    />
                    <Line 
                        type="monotone" 
                        dataKey="fechados" 
                        stroke="var(--color-fechados)" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: "var(--color-fechados)" }} 
                    />
                  </LineChart>
              </ChartContainer>
              
              {forecast && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50 flex items-center gap-3 text-sm text-muted-foreground">
                   <div className="p-1.5 bg-background rounded-md shadow-sm">
                      <Activity className="h-4 w-4 text-primary" />
                   </div>
                   <span>
                      Previsão (IA): Tendência de <strong>{Math.round(forecast)} novos casos</strong> para o próximo mês.
                   </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. INSIGHTS IA */}
          <div className="h-full">
            <SmartInsightsCard 
              insights={formattedInsights} 
              isLoading={isLoading} 
              className="h-full border-border/50 shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 4. DONUT CHART (Violações) */}
          <Card className="shadow-sm border-border/60 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500"/> Tipificação das Violações
              </CardTitle>
              <CardDescription>Distribuição percentual por natureza</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-[350px] w-full flex items-center justify-center">
                {data.pieData.length > 0 ? (
                  <ChartContainer config={data.violationConfig} className="mx-auto aspect-square h-full">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="w-40" />} />
                      <Pie 
                        data={data.pieData} 
                        dataKey="value" 
                        nameKey="name" 
                        innerRadius={80} 
                        outerRadius={110}
                        strokeWidth={4}
                        stroke="hsl(var(--card))"
                        paddingAngle={2}
                      >
                        {data.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
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
          {/* Número Principal: dy="-10" para subir um pouco do centro exato */}
          <tspan
            x={viewBox.cx}
            y={viewBox.cy}
            dy="-0.3em" 
            className="fill-foreground text-4xl font-bold tracking-tight"
          >
            {totalViolations}
          </tspan>
          
          {/* Legenda: dy="24" para ficar abaixo do número */}
          <tspan
            x={viewBox.cx}
            y={viewBox.cy}
            dy="1.5em"
            className="fill-muted-foreground text-xs font-semibold uppercase tracking-wider"
          >
            OCORRÊNCIAS
          </tspan>
        </text>
      )
    }
  }}
/>
                      </Pie>
                      <ChartLegend 
                        content={<ChartLegendContent payload={[]} nameKey="realLabel" />} 
                        className="-translate-y-2 flex-wrap gap-3 [&>*]:basis-auto" 
                      />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <FileBarChart className="h-10 w-10 mb-2 stroke-1" />
                    <p className="text-sm">Nenhuma violação tipificada.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. BAR CHART (Produtividade) */}
          <Card className="shadow-sm border-border/60 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary"/> Produtividade Técnica
              </CardTitle>
              <CardDescription>Intervenções registradas por técnico</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-[350px] w-full">
                {productivity.length > 0 ? (
                  <ChartContainer config={productivityChartConfig} className="w-full h-full">
                    <BarChart accessibilityLayer data={productivity} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tickLine={false} 
                        axisLine={false} 
                        width={110}
                        fontSize={13}
                        tick={{fill: 'hsl(var(--foreground))', fontWeight: 500}} 
                        className="text-sm"
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip 
                        cursor={{fill: 'hsl(var(--muted))', opacity: 0.1}} 
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} barSize={32}>
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          className="fill-foreground font-bold text-sm" 
                          formatter={(v: any) => v > 0 ? v : ''} 
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                    <Briefcase className="h-10 w-10 mb-2 stroke-1" />
                    <p className="text-sm">Sem registros de produtividade.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}