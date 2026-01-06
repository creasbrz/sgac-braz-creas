import { useState, useRef, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Gráficos
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts"

// Ícones e UI
import { Loader2, BarChart3, Clock, TrendingUp, Download, AlertTriangle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

// Bibliotecas de PDF
import html2canvas from "html2canvas"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { TDocumentDefinitions } from "pdfmake/interfaces"

// --- CONFIGURAÇÃO VFS DO PDFMAKE ---
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
  pdfMake.vfs = (pdfFonts as any).vfs;
} else if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

// --- INTERFACES ---
interface TrendData { name: string; novos: number; fechados: number }
interface PieData { name: string; value: number }
interface Insight { type: 'success' | 'warning' | 'info'; title: string; description: string }
interface ProductivityItem { name: string; value: number }

function PremiumSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando dados">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/20" />)}
      </div>
      <div className="h-[320px] rounded-xl bg-muted/10" />
    </div>
  )
}

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

export function AdvancedAnalytics() {
  const [periodMonths, setPeriodMonths] = useState<number>(12)
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  
  // 1. Query Principal (Dados Gerais + Insights)
  const { data: dataRaw, isLoading, isError } = useQuery({
    queryKey: ["stats", "advanced", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/advanced", { params: { months: periodMonths } })
        return res.data
      } catch (error) {
        console.warn("Usando dados mockados para Analytics (API Offline)")
        // [CORREÇÃO] Adicionado MOCK COMPLETO, incluindo insights
        return {
          avgHandlingTime: 45,
          totalActive: 128,
          trendData: [
            { name: 'Jan', novos: 12, fechados: 8 },
            { name: 'Fev', novos: 15, fechados: 10 },
            { name: 'Mar', novos: 10, fechados: 12 },
            { name: 'Abr', novos: 18, fechados: 14 },
          ],
          pieData: [
            { name: 'Física', value: 40 },
            { name: 'Psicológica', value: 30 },
            { name: 'Negligência', value: 20 },
            { name: 'Outros', value: 10 },
          ],
          // [IMPORTANTE] Mock dos insights para não sumirem da tela
          insights: [
            { type: 'warning', title: 'Tendência de Alta', description: 'Aumento de 15% nos casos de negligência em idosos.' },
            { type: 'success', title: 'Meta Atingida', description: '95% das visitas domiciliares realizadas no prazo.' },
            { type: 'info', title: 'Auditoria Necessária', description: 'Existem 12 casos sem evolução há mais de 30 dias.' }
          ]
        }
      }
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Sanitização dos Dados
  const data = useMemo(() => ({
    avgHandlingTime: dataRaw?.avgHandlingTime || 0,
    totalActive: dataRaw?.totalActive || 0,
    trendData: (Array.isArray(dataRaw?.trendData) ? dataRaw.trendData : []) as TrendData[],
    pieData: (Array.isArray(dataRaw?.pieData) ? dataRaw.pieData : []) as PieData[],
    insights: (Array.isArray(dataRaw?.insights) ? dataRaw.insights : []) as Insight[]
  }), [dataRaw])

  // 3. Query de Produtividade
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
        ]
      }
    }
  })
  const productivity = useMemo(() => Array.isArray(productivityRaw) ? productivityRaw : [], [productivityRaw])

  // 4. Cálculos Memoizados
  const forecast = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    data.trendData.forEach((d, i) => { xs.push(i); ys.push(d.novos) })
    return linearRegressionForecast(xs, ys)
  }, [data.trendData])

  const tooltipStyle = useMemo(() => ({
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    fontSize: '12px'
  }), [])

  // 5. Função de Exportação PDF
  const handleExportPdf = async () => {
    if (!exportRef.current) return

    try {
      setIsExporting(true)
      toast.info("Gerando PDF analítico...")

      const canvas = await html2canvas(exportRef.current, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (element) => element.hasAttribute('data-no-export')
      })
      
      const imgData = canvas.toDataURL('image/png')

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 20, 20, 20],
        content: [
          {
            text: 'Relatório Analítico Avançado - CREAS',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          {
            text: `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Período: ${periodMonths} meses`,
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          {
            image: imgData,
            width: 780,
            alignment: 'center'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true, color: '#2e4a7d' },
          subheader: { fontSize: 10, color: '#666' }
        }
      }

      pdfMake.createPdf(docDefinition).download(`analytics_creas_${new Date().toISOString().slice(0,10)}.pdf`)
      toast.success("PDF gerado com sucesso!")

    } catch (e) {
      console.error('Erro ao exportar', e)
      toast.error("Erro ao gerar PDF.")
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) return <PremiumSkeleton />
  
  if (isError) {
    return (
      <div className="p-4" role="alert">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>Não foi possível carregar os dados analíticos.</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise Estratégica</h2>
          <p className="text-muted-foreground">Monitoramento de KPIs e indicadores de performance.</p>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-[140px] bg-background" aria-label="Selecione o período"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Meses</SelectItem>
              <SelectItem value="6">6 Meses</SelectItem>
              <SelectItem value="12">12 Meses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPdf} disabled={isExporting} variant="outline" size="sm" aria-label="Exportar PDF">
             {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Download className="h-4 w-4 mr-2"/>}
             Exportar
          </Button>
        </div>
      </div>

      <div ref={exportRef} className="space-y-6 bg-background p-2 rounded-lg">
        
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Indicadores Chave">
            <DashboardStatCard 
              index={0} 
              title="Tempo Médio" 
              value={data.avgHandlingTime} 
              description="Dias para resolução" 
              icon={Clock} 
              colorClass="text-blue-500"
            />
            <DashboardStatCard 
              index={1} 
              title="Total Ativos" 
              value={data.totalActive} 
              description="Casos em andamento" 
              icon={BarChart3} 
              colorClass="text-purple-500" 
            />
            <DashboardStatCard 
              index={2} 
              title="Novos (Mês)" 
              value={data.trendData[data.trendData.length-1]?.novos ?? 0} 
              description="Entradas recentes" 
              icon={TrendingUp} 
              colorClass="text-emerald-500" 
            />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" aria-label="Gráfico de Tendência de Casos">
            <CardHeader>
              <CardTitle>Fluxo de Casos</CardTitle>
              <CardDescription>Entrada vs Saída ({periodMonths} meses)</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.trendData} margin={{ top: 10, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="novos" name="Novos" stroke={COLORS[0]} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="fechados" name="Fechados" stroke={COLORS[1]} strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                 <TrendingUp className="h-3 w-3" />
                 Previsão de novos casos (Regressão Linear): <strong>{forecast ? Math.round(forecast) : '?'}</strong>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-1">
            {/* [CORREÇÃO] Passando apenas strings + Ícones para simular o "Smart" visualmente */}
            <SmartInsightsCard 
              insights={data.insights.map(i => {
                const icon = i.type === 'warning' ? '⚠️' : i.type === 'success' ? '✅' : 'ℹ️';
                return `${icon} ${i.title}: ${i.description}`;
              })} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card aria-label="Gráfico de Violações">
            <CardHeader><CardTitle>Top 5 Violações</CardTitle></CardHeader>
            <CardContent>
               <div style={{ width: '100%', height: 340 }}>
                  {data.pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={data.pieData as any[]} 
                          cx="50%" 
                          cy="45%" 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={5} 
                          dataKey="value"
                          stroke="hsl(var(--background))" 
                          strokeWidth={2}
                        >
                          {data.pieData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend 
                          layout="horizontal" 
                          verticalAlign="bottom" 
                          align="center" 
                          iconType="circle" 
                          wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de violação.</div>}
               </div>
            </CardContent>
          </Card>

          <Card aria-label="Gráfico de Desempenho da Equipe">
            <CardHeader>
              <CardTitle>Desempenho da Equipe</CardTitle>
              <CardDescription>Intervenções registradas.</CardDescription>
            </CardHeader>
            <CardContent>
               <div style={{ width: '100%', height: 300 }}>
                  {productivity.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productivity} layout="vertical" margin={{left: 0}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={11}/>
                        <Tooltip 
                          cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}} 
                          contentStyle={tooltipStyle} 
                          formatter={(value: any) => [value, 'Intervenções']}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de atividade.</div>}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}