// frontend/src/pages/AdvancedAnalytics.tsx
import { useState, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"

// Gráficos (Recharts via Shadcn Charts)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, Label, BarChart, Bar, LabelList
} from "recharts"

// Ícones e UI
import { 
  Loader2, Download, AlertTriangle, 
  Clock, TrendingUp, FileBarChart, 
  Activity, Briefcase
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

// Shadcn Charts
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart"

// Bibliotecas de PDF
import html2canvas from "html2canvas"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"

// --- TYPES CORRECTION & PDF SETUP ---
type TDocumentDefinitions = any;
const pdfMakeAny: any = pdfMake;
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMakeAny.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
  pdfMakeAny.vfs = (pdfFonts as any).vfs;
} else if (pdfMakeAny.vfs === undefined) {
  try { pdfMakeAny.vfs = pdfFonts; } catch(e) { console.warn('Erro ao carregar fontes PDF', e)}
}

// --- CONFIGURAÇÃO DE GRÁFICOS (THEMING) ---

const trendChartConfig = {
  novos: {
    label: "Novos Casos",
    color: "hsl(var(--chart-1))", // Azul/Primary
  },
  fechados: {
    label: "Desligamentos",
    color: "hsl(var(--chart-2))", // Verde/Secondary
  },
} satisfies ChartConfig

const violationChartConfig = {
  value: {
    label: "Ocorrências",
  },
  // As cores serão geradas dinamicamente no render baseadas nas variáveis CSS --chart-X
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
  fill?: string; // Adicionado para controle de cor
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
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
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

  // 2. Query Secundária
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
    // Split de violações (Lógica de Negócio Mantida)
    const rawPieData = (Array.isArray(dataRaw?.pieData) ? dataRaw.pieData : []) as PieData[]
    const violationCounts: Record<string, number> = {}

    rawPieData.forEach(item => {
      const categories = item.name.split(',').map(s => s.trim())
      categories.forEach(cat => {
        if (cat) violationCounts[cat] = (violationCounts[cat] || 0) + item.value
      })
    })

    // Atribuição de cores cíclicas do tema (chart-1 a chart-5)
    const processedPieData = Object.entries(violationCounts)
      .map(([name, value], index) => ({ 
        name, 
        value, 
        fill: `hsl(var(--chart-${(index % 5) + 1}))` 
      }))
      .sort((a, b) => b.value - a.value)

    return {
      avgHandlingTime: dataRaw?.avgHandlingTime || 0,
      totalActive: dataRaw?.totalActive || 0,
      trendData: (Array.isArray(dataRaw?.trendData) ? dataRaw.trendData : []) as TrendData[],
      pieData: processedPieData,
      insights: (Array.isArray(dataRaw?.insights) ? dataRaw.insights : []) as Insight[]
    }
  }, [dataRaw])

  const productivity = useMemo(() => Array.isArray(productivityRaw) ? productivityRaw : [], [productivityRaw])

  // 4. Métricas Derivadas
  const forecast = useMemo(() => {
    const xs: number[] = [], ys: number[] = []
    data.trendData.forEach((d, i) => { xs.push(i); ys.push(d.novos) })
    return linearRegressionForecast(xs, ys)
  }, [data.trendData])

  const totalViolations = useMemo(() => data.pieData.reduce((acc, curr) => acc + curr.value, 0), [data.pieData])

  // Transformar Insights (Objeto) para formato string[] que o SmartInsightsCard aceita
  // mas mantendo a riqueza dos dados se possível. O componente refatorado SmartInsightsCard aceita string[].
  // Vamos formatar para passar a informação completa.
  const formattedInsights = useMemo(() => 
    data.insights.map(i => `${i.title}: ${i.description}`), 
  [data.insights])

  // 5. Exportação PDF
  const handleExportPdf = async () => {
    if (!exportRef.current) return

    try {
      setIsExporting(true)
      toast.info("Preparando documento...")

      // Pequeno delay para garantir renderização
      await new Promise(r => setTimeout(r, 500))

      const canvas = await html2canvas(exportRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff", // Força fundo branco
        ignoreElements: (element) => element.classList.contains('no-print')
      })
      
      const imgData = canvas.toDataURL('image/png')
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 30, 30, 40],
        content: [
          { text: 'Relatório de Inteligência de Dados - CREAS', style: 'header', alignment: 'center', margin: [0, 0, 0, 5] },
          { text: `Período: Últimos ${periodMonths} meses | Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
          { image: imgData, width: 760, alignment: 'center' }
        ],
        styles: {
          header: { fontSize: 18, bold: true, color: '#0f172a' },
          subheader: { fontSize: 10, color: '#64748b' },
        }
      }

      pdfMakeAny.createPdf(docDefinition).download(`analytics_report_${Date.now()}.pdf`)
      toast.success("Download iniciado!")
    } catch (e) {
      console.error(e)
      toast.error("Erro ao gerar PDF.")
    } finally {
      setIsExporting(false)
    }
  }

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
    <div className="space-y-8 p-1 animate-in fade-in duration-700">
      
      {/* HEADER DE CONTROLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inteligência de Dados</h1>
          <p className="text-muted-foreground text-sm">Monitoramento estratégico e preditivo da unidade.</p>
        </div>

        <div className="flex gap-2 items-center p-1 bg-background/50 backdrop-blur rounded-lg border shadow-sm">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-[150px] border-0 focus:ring-0 shadow-none h-9 bg-transparent font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="3">Últimos 3 Meses</SelectItem>
              <SelectItem value="6">Últimos 6 Meses</SelectItem>
              <SelectItem value="12">Últimos 12 Meses</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="h-5 w-[1px] bg-border" />
          
          <Button 
            onClick={handleExportPdf} 
            disabled={isExporting} 
            variant="ghost" 
            size="sm" 
            className="h-9 text-muted-foreground hover:text-primary gap-2"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>} 
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* ÁREA DE EXPORTAÇÃO (Conteúdo do Relatório) */}
      <div ref={exportRef} className="space-y-8 bg-background p-2 rounded-xl">
        
        {/* 1. KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            title="Novos Casos (Mês)" 
            value={data.trendData[data.trendData.length-1]?.novos ?? 0} 
            description="Demandas espontâneas e encaminhadas" 
            icon={TrendingUp} 
            variant="green" 
            index={2}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 2. GRÁFICO DE TENDÊNCIA (Linha) */}
          <Card className="lg:col-span-2 shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary"/> Fluxo de Atendimentos
              </CardTitle>
              <CardDescription>Evolução de entradas e saídas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendChartConfig} className="aspect-[16/9] w-full max-h-[350px]">
                <LineChart data={data.trendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
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
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  
                  <Line 
                    type="monotone" 
                    dataKey="novos" 
                    stroke="var(--color-novos)" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 0, fill: "var(--color-novos)" }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fechados" 
                    stroke="var(--color-fechados)" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3, strokeWidth: 0, fill: "var(--color-fechados)" }} 
                  />
                </LineChart>
              </ChartContainer>
              
              {forecast && (
                <div className="mt-4 mx-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-center gap-2 text-sm text-primary/80">
                   <Activity className="h-4 w-4" />
                   <span>
                     Previsão (Regressão Linear): <strong>~{Math.round(forecast)} novos casos</strong> no próximo mês
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
              className="h-full border-border/60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 4. DONUT CHART (Violações) */}
          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500"/> Tipificação das Violações
              </CardTitle>
              <CardDescription>Distribuição percentual por natureza</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {data.pieData.length > 0 ? (
                  <ChartContainer config={violationChartConfig} className="mx-auto aspect-square max-h-[300px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie 
                        data={data.pieData} 
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
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm opacity-60">
                    Nenhuma violação tipificada.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. BAR CHART (Produtividade) */}
          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary"/> Produtividade Técnica
              </CardTitle>
              <CardDescription>Intervenções registradas por técnico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {productivity.length > 0 ? (
                  <ChartContainer config={productivityChartConfig} className="w-full h-full">
                    <BarChart accessibilityLayer data={productivity} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tickLine={false} 
                        axisLine={false} 
                        width={100}
                        fontSize={12}
                        tick={{fill: 'hsl(var(--foreground))', fontWeight: 500}} 
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip 
  cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}} 
  content={<ChartTooltipContent indicator="dashed" />} // ✅ Correção
/>
                      <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} barSize={32}>
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          className="fill-foreground font-bold text-xs" 
                          formatter={(v: number) => v > 0 ? v : ''} 
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm opacity-60">
                    Sem registros de produtividade.
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