// frontend/src/pages/AdvancedAnalytics.tsx
import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts"

import { Loader2, BarChart3, Clock, TrendingUp, Download } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard"
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

// CORES
const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

// Skeleton simples
function PremiumSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0,1,2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/20" />)}
      </div>
      <div className="h-[320px] rounded-xl bg-muted/10" />
    </div>
  )
}

// Regressão linear
function linearRegressionForecast(xs: number[], ys: number[]) {
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
  
  // 1. Dados Principais
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", "advanced", periodMonths],
    queryFn: async () => {
      const res = await api.get("/stats/advanced", { params: { months: periodMonths } })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

  // 2. Produtividade
  const { data: productivity } = useQuery({
    queryKey: ["stats", "productivity"],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/productivity")
        return res.data
      } catch { return [] }
    }
  })

  // 3. Heatmap
  const { data: heatmap } = useQuery({
    queryKey: ["stats", "heatmap", periodMonths],
    queryFn: async () => {
      try {
        const res = await api.get("/stats/heatmap", { params: { months: periodMonths } })
        return res.data 
      } catch { return [] }
    }
  })

  // Exportação PDF
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPdf = async () => {
    try {
      setIsExporting(true)
      // @ts-ignore
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      
      if (!exportRef.current) return
      
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'pt', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height)
      
      pdf.addImage(imgData, 'PNG', 20, 20, canvas.width * ratio - 40, canvas.height * ratio - 40)
      pdf.save(`analytics_sgac_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (e) {
      console.error('Erro ao exportar', e)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) return <PremiumSkeleton />
  if (isError || !data) return <div className="p-8 text-center text-destructive">Erro ao carregar dados.</div>

  const trendData = Array.isArray(data.trendData) ? data.trendData : []
  const pieData = Array.isArray(data.pieData) ? data.pieData : []
  
  const xs: number[] = []
  const ys: number[] = []
  trendData.forEach((d: any, i: number) => { xs.push(i); ys.push(d.novos) })
  const forecast = linearRegressionForecast(xs, ys)

  return (
    <div className="space-y-6 animate-in fade-in duration-700" ref={exportRef}>

      {/* Controles */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
           <DashboardStatCard title="Tempo Médio" value={data.avgHandlingTime} description="Dias" icon={Clock} colorClass="text-blue-500" />
           <DashboardStatCard title="Total Ativos" value={data.totalActive} description="Casos hoje" icon={BarChart3} colorClass="text-purple-500" />
           <DashboardStatCard title="Novos (Mês)" value={trendData[trendData.length-1]?.novos ?? 0} description="Entradas" icon={TrendingUp} colorClass="text-emerald-500" />
        </div>

        <div className="flex gap-2 items-center">
          <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
            <SelectTrigger className="w-[140px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Meses</SelectItem>
              <SelectItem value="6">6 Meses</SelectItem>
              <SelectItem value="12">12 Meses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPdf} disabled={isExporting} variant="outline" size="icon">
             {isExporting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
          </Button>
        </div>
      </div>

      {/* Linha + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Casos</CardTitle>
            <CardDescription>Entrada vs Saída ({periodMonths} meses)</CardDescription>
          </CardHeader>
          <CardContent>
            {/* FIX DE ALTURA: width 99% e minHeight */}
            <div style={{ width: '99%', height: 320, minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%" debounce={200}>
                <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="novos" name="Novos" stroke={COLORS[0]} strokeWidth={3} />
                  <Line type="monotone" dataKey="fechados" name="Fechados" stroke={COLORS[1]} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-muted-foreground text-center">
               Previsão de novos casos para o próximo mês (IA Linear): <strong>{forecast ? Math.round(forecast) : '?'}</strong>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-1">
          <SmartInsightsCard insights={data.insights ?? []} />
        </div>
      </div>

      {/* Produtividade e Heatmap e Pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Violações (Pizza) - AGORA FUNCIONA */}
        <Card>
          <CardHeader><CardTitle>Violações (Top 5)</CardTitle></CardHeader>
          <CardContent>
             <div style={{ width: '99%', height: 300, minHeight: 300 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de violação.</div>}
             </div>
          </CardContent>
        </Card>

        {/* Produtividade por Técnico */}
        <Card>
          <CardHeader><CardTitle>Produtividade Atual</CardTitle></CardHeader>
          <CardContent>
             <div style={{ width: '99%', height: 300, minHeight: 300 }}>
                {productivity && productivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                    <BarChart data={productivity} layout="vertical" margin={{left: 10}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={12}/>
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill={COLORS[4]} radius={[0,4,4,0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados.</div>}
             </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Intensidade de Atividades</CardTitle></CardHeader>
          <CardContent>
             <div className="h-[150px] overflow-y-auto">
                {heatmap && heatmap.length > 0 ? (
                   <div className="grid grid-cols-12 md:grid-cols-[repeat(auto-fill,minmax(30px,1fr))] gap-1">
                      {heatmap.slice(0, 90).map((h: any) => { 
                         const intensity = Math.min(4, Math.ceil(h.count / 2));
                         const colors = ['bg-muted/20', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-600'];
                         return (
                            <div key={h.date} title={`${h.date}: ${h.count} logs`} className={`aspect-square rounded-sm ${colors[intensity]} text-[10px] flex items-center justify-center text-transparent hover:text-black transition-all cursor-default`}>
                               {h.count}
                            </div>
                         )
                      })}
                   </div>
                ) : <div className="flex h-full items-center justify-center text-muted-foreground">Sem histórico recente.</div>}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}