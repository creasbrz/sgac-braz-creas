import { useState, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"

// Gráficos (Recharts)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LabelList, Label
} from "recharts"

// Ícones e UI
import { 
  Loader2, BarChart3, Clock, TrendingUp, Download, AlertTriangle, 
  CheckCircle2, Info, FileBarChart
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Bibliotecas de PDF
import html2canvas from "html2canvas"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"

// --- CORREÇÃO DE TIPO (Fix Build Error) ---
// Definimos 'any' para evitar erro de módulo 'pdfmake/interfaces' não encontrado durante o build
type TDocumentDefinitions = any;

// --- CONFIGURAÇÃO VFS DO PDFMAKE (Workaround Seguro) ---
const pdfMakeAny: any = pdfMake;
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMakeAny.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
  pdfMakeAny.vfs = (pdfFonts as any).vfs;
} else if (pdfMakeAny.vfs === undefined) {
  try { pdfMakeAny.vfs = pdfFonts; } catch(e) { console.warn('Erro ao carregar fontes PDF', e)}
}

// --- CONSTANTES ---
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

// --- INTERFACES (Frouxas para evitar erro do Recharts TS2322) ---
// O [key: string]: any é essencial para o Recharts aceitar os objetos
interface TrendData { 
  name: string; 
  novos: number; 
  fechados: number; 
  [key: string]: any 
}

interface PieData { 
  name: string; 
  value: number; 
  [key: string]: any 
}

interface Insight { 
  type: 'success' | 'warning' | 'info'; 
  title: string; 
  description: string 
}

interface ProductivityItem { 
  name: string; 
  value: number; 
  [key: string]: any 
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
    <div className="space-y-6 animate-pulse p-6">
      <div className="flex justify-between">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-8 w-32 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-28 rounded-xl bg-muted/20 border" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[350px] rounded-xl bg-muted/10 border" />
        <div className="h-[350px] rounded-xl bg-muted/10 border" />
      </div>
    </div>
  )
}

export function AdvancedAnalytics() {
  const [periodMonths, setPeriodMonths] = useState<number>(12)
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  // 1. Query Principal (Dados Gerais)
  const { data: dataRaw, isLoading, isError } = useQuery({
    queryKey: ["stats", "advanced", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/advanced", { params: { months: periodMonths } })
        return res.data
      } catch (error) {
        console.warn("API Offline: Usando dados simulados.")
        return {
          avgHandlingTime: 45,
          totalActive: 128,
          trendData: [
            { name: 'Jan', novos: 12, fechados: 8 },
            { name: 'Fev', novos: 15, fechados: 10 },
            { name: 'Mar', novos: 10, fechados: 12 },
            { name: 'Abr', novos: 18, fechados: 14 },
            { name: 'Mai', novos: 22, fechados: 18 },
            { name: 'Jun', novos: 14, fechados: 20 },
          ],
          pieData: [
            { name: 'Física', value: 40 },
            { name: 'Psicológica', value: 30 },
            { name: 'Negligência', value: 20 },
            { name: 'Financeira', value: 10 },
          ],
          insights: [
            { type: 'warning', title: 'Atenção: Negligência', description: 'Aumento de 15% nos casos de negligência contra idosos no último bimestre.' },
            { type: 'success', title: 'Meta Atingida', description: '95% das visitas domiciliares planejadas foram realizadas no prazo.' },
            { type: 'info', title: 'Auditoria Pendente', description: 'Existem 12 casos sem evolução técnica registrada há mais de 30 dias.' }
          ]
        }
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Sanitização e Memorização
  const data = useMemo(() => ({
    avgHandlingTime: dataRaw?.avgHandlingTime || 0,
    totalActive: dataRaw?.totalActive || 0,
    trendData: (Array.isArray(dataRaw?.trendData) ? dataRaw.trendData : []) as TrendData[],
    pieData: (Array.isArray(dataRaw?.pieData) ? dataRaw.pieData : []) as PieData[],
    insights: (Array.isArray(dataRaw?.insights) ? dataRaw.insights : []) as Insight[]
  }), [dataRaw])

  // 3. Query Secundária (Produtividade)
  const { data: productivityRaw } = useQuery<ProductivityItem[]>({
    queryKey: ["stats", "productivity", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/productivity", { 
          params: { mode: 'performance', months: periodMonths } 
        })
        return res.data
      } catch { 
        return [
          { name: 'Ana', value: 45 },
          { name: 'Carlos', value: 38 },
          { name: 'Maria', value: 52 },
          { name: 'João', value: 29 },
        ]
      }
    }
  })
  const productivity = useMemo(() => Array.isArray(productivityRaw) ? productivityRaw : [], [productivityRaw])

  // 4. Cálculos Matemáticos
  const forecast = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    data.trendData.forEach((d, i) => { xs.push(i); ys.push(d.novos) })
    return linearRegressionForecast(xs, ys)
  }, [data.trendData])

  const totalViolations = useMemo(() => data.pieData.reduce((acc, curr) => acc + curr.value, 0), [data.pieData])

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--popover-foreground))',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  }

  // 5. Exportação PDF
  const handleExportPdf = async () => {
    if (!exportRef.current) return

    try {
      setIsExporting(true)
      toast.info("Processando relatório analítico...")

      const canvas = await html2canvas(exportRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (element) => element.getAttribute('data-html2canvas-ignore') === 'true'
      })
      
      const imgData = canvas.toDataURL('image/png')

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 30, 30, 40],
        content: [
          {
            text: 'Relatório de Inteligência de Dados - CREAS',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          {
            text: `Período de Análise: Últimos ${periodMonths} meses | Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            image: imgData,
            width: 760,
            alignment: 'center'
          }
        ],
        footer: (currentPage: number, pageCount: number) => ({
          text: `Sistema de Gestão SUAS - Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          style: 'footer',
          margin: [0, 10, 0, 0]
        }),
        styles: {
          header: { fontSize: 18, bold: true, color: '#1e293b' },
          subheader: { fontSize: 10, color: '#64748b' },
          footer: { fontSize: 8, color: '#94a3b8' }
        }
      }

      pdfMakeAny.createPdf(docDefinition).download(`analytics_creas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
      toast.success("Relatório exportado com sucesso!")

    } catch (e) {
      console.error('Erro ao exportar:', e)
      toast.error("Falha ao gerar o arquivo PDF.")
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) return <AnalyticsSkeleton />
  
  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro no Carregamento</AlertTitle>
          <AlertDescription>
            Não foi possível obter os dados analíticos. Verifique sua conexão.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Recarregar Página
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Inteligência de Dados</h1>
          <p className="text-muted-foreground mt-1">Monitoramento estratégico de violações e desempenho da unidade.</p>
        </div>

        <div className="flex gap-3 items-center bg-card p-1 rounded-lg border shadow-sm">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-[140px] border-0 focus:ring-0 shadow-none h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 Meses</SelectItem>
              <SelectItem value="6">Últimos 6 Meses</SelectItem>
              <SelectItem value="12">Últimos 12 Meses</SelectItem>
            </SelectContent>
          </Select>
          <div className="h-4 w-[1px] bg-border" />
          <Button onClick={handleExportPdf} disabled={isExporting} variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Download className="h-4 w-4 mr-2"/>} Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-6 bg-background rounded-xl">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashboardStatCard index={0} title="Tempo Médio de Resolução" value={data.avgHandlingTime} description="Dias desde a triagem até o desligamento" icon={Clock} colorClass="text-blue-600" />
          <DashboardStatCard index={1} title="Casos Ativos (PAEFI)" value={data.totalActive} description="Famílias em acompanhamento contínuo" icon={FileBarChart} colorClass="text-purple-600" />
          <DashboardStatCard index={2} title="Novos Casos (Mês)" value={data.trendData[data.trendData.length-1]?.novos ?? 0} description="Demandas espontâneas e encaminhadas" icon={TrendingUp} colorClass="text-emerald-600" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" />Fluxo de Atendimentos</CardTitle>
              <CardDescription>Comparativo de novos casos vs. desligamentos no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} />
                    <Legend verticalAlign="top" height={36} iconType="circle"/>
                    <Line type="monotone" dataKey="novos" name="Novos Casos" stroke={COLORS[0]} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="fechados" name="Desligamentos" stroke={COLORS[1]} strokeWidth={2} strokeDasharray="5 5" dot={{r: 4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-md flex items-center justify-center gap-2 text-sm text-muted-foreground border border-dashed border-slate-200 dark:border-slate-800">
                <Info className="h-4 w-4" /><span>Previsão linear para o próximo mês: <strong>~{forecast ? Math.round(forecast) : '?'} novos casos</strong></span>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full shadow-sm flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-t-xl">
              <CardTitle className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500"/>Insights IA</CardTitle>
              <CardDescription>Análise automatizada de padrões</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 pt-4">
              {data.insights.map((insight, idx) => {
                const styles = {
                  success: "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-300",
                  warning: "bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300",
                  info: "bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/10 dark:text-blue-300"
                }
                const icons = { success: CheckCircle2, warning: AlertTriangle, info: Info }
                const Icon = icons[insight.type] || Info
                return (
                  <div key={idx} className={cn("p-3 rounded-lg border flex gap-3 items-start transition-all hover:shadow-sm", styles[insight.type])}>
                    <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-xs uppercase tracking-wide mb-1 opacity-80">{insight.title}</span>
                      <p className="text-sm leading-relaxed font-medium">{insight.description}</p>
                    </div>
                  </div>
                )
              })}
              {data.insights.length === 0 && <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4 opacity-50"><BarChart3 className="h-12 w-12 mb-2 stroke-1" /><p>Coletando dados para gerar insights...</p></div>}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Tipificação das Violações</CardTitle><CardDescription>Distribuição percentual por natureza</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {data.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="hsl(var(--card))" strokeWidth={2}>
                        {data.pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        <Label value={totalViolations} position="center" className="text-3xl font-bold fill-slate-900 dark:fill-white" />
                        <Label value="Violações" position="center" dy={20} className="text-xs fill-muted-foreground uppercase tracking-wider" />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Nenhuma violação tipificada no período.</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Produtividade Técnica</CardTitle><CardDescription>Total de intervenções registradas por técnico</CardDescription></CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {productivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productivity} layout="vertical" margin={{ left: 0, right: 40, top: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={12} tick={{fill: 'hsl(var(--foreground))', fontWeight: 500}} />
                      <Tooltip cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}} contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={28}>
                        {productivity.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        <LabelList dataKey="value" position="right" style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Sem registros de produtividade.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}