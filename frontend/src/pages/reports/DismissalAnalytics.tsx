import { useState, useMemo } from 'react'
import { useQuery } from "@tanstack/react-query"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, LabelList
} from "recharts"
import { FileX, CheckCircle2, Ban, Download, MapPin, PieChart as PieIcon } from "lucide-react"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDescription } from '@/components/ui/alert'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart"

import { api } from "@/lib/api"
import { generateDismissalPDF } from "@/utils/pdfGenerator"

// --- TYPES ---
interface DismissalData {
  total: number
  byMotivo: { name: string; value: number }[]
  byDestino: { name: string; value: number }[]
  list: any[]
}

// --- CHART CONFIG ---
const reasonChartConfig = {
  value: {
    label: "Casos",
  },
} satisfies ChartConfig

const destinationChartConfig = {
  value: {
    label: "Encaminhamentos",
    color: "hsl(var(--chart-2))", // Emerald/Green theme
  },
} satisfies ChartConfig

export function DismissalAnalytics() {
  const [months, setMonths] = useState(12)

  const { data, isLoading, isError, refetch } = useQuery<DismissalData>({
    queryKey: ["reports", "dismissals", months],
    queryFn: async () => {
      const response = await api.get("/reports/dismissals", { params: { months } })
      return response.data
    },
    retry: 1
  })

  // Stats Calculation
  const stats = useMemo(() => {
    if (!data || data.total === 0) return { successRate: 0, evasionRate: 0 }

    const total = data.total

    const successCount = data.byMotivo
      .filter(m => m.name.toLowerCase().includes('minimização') || m.name.toLowerCase().includes('autonomia'))
      .reduce((acc, curr) => acc + curr.value, 0)

    const evasionCount = data.byMotivo
      .filter(m => 
        m.name.toLowerCase().includes('recusa') || 
        m.name.toLowerCase().includes('não localizado')
      )
      .reduce((acc, curr) => acc + curr.value, 0)

    return {
      successRate: Math.round((successCount / total) * 100),
      evasionRate: Math.round((evasionCount / total) * 100)
    }
  }, [data])

  // Chart Data Processing (Colors)
  const reasonData = useMemo(() => {
    if (!data?.byMotivo) return []
    return data.byMotivo.map((item, index) => ({
      ...item,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }))
  }, [data])

  const handleExport = () => {
    if (!data) return
    
    generateDismissalPDF({
      periodo: `Últimos ${months} meses`,
      total: data.total,
      successRate: stats.successRate,
      evasionRate: stats.evasionRate,
      byReason: data.byMotivo,
      monthlyTrend: data.byDestino 
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="flex justify-between items-center">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-destructive/5 text-destructive animate-in fade-in">
        <div className="text-center p-4">
          <AlertDescription className="font-medium mb-4 block">
            Erro na Análise
          </AlertDescription>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center border-2 border-dashed rounded-xl bg-muted/10 animate-in fade-in">
        <div className="p-4 bg-muted/50 rounded-full">
          <FileX className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum desligamento</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Não há registros de casos encerrados para o período de {months} meses.
          </p>
        </div>
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Indicadores de Desligamento</h2>
            <p className="text-sm text-muted-foreground mt-1">Análise qualitativa dos encerramentos e destinos.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
                <SelectTrigger className="w-full sm:w-[140px] h-9">
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">1 ano</SelectItem>
                    <SelectItem value="24">2 anos</SelectItem>
                    <SelectItem value="60">5 anos</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 h-9">
                <Download className="h-4 w-4"/>
                <span className="hidden sm:inline">PDF</span>
            </Button>
        </div>
      </div>

      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardStatCard 
          title="Total de Desligamentos" 
          value={data.total} 
          description="Casos encerrados no período"
          icon={FileX} 
          variant="default" 
        />
        <DashboardStatCard 
          title="Taxa de Sucesso" 
          value={`${stats.successRate}%`} 
          description="Autonomia alcançada"
          icon={CheckCircle2} 
          variant="green" 
        />
        <DashboardStatCard 
          title="Taxa de Evasão" 
          value={`${stats.evasionRate}%`} 
          description="Recusa ou não localizado"
          icon={Ban} 
          variant="rose" 
        />
      </div>

      {/* 2. CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Motivos (Pie Chart) */}
        <Card className="flex flex-col shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary"/> Motivos do Desligamento
            </CardTitle>
            <CardDescription>Distribuição proporcional por causa.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ChartContainer config={reasonChartConfig} className="mx-auto aspect-square max-h-[350px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={reasonData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={4}
                  labelLine={false}
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                />
                <ChartLegend 
                  content={<ChartLegendContent nameKey="name" />} 
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" 
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Destinos (Bar Chart Horizontal) */}
        <Card className="flex flex-col shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500"/> Destinos Pós-Alta
                    </CardTitle>
                    <CardDescription>Encaminhamentos realizados.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ChartContainer config={destinationChartConfig} className="w-full h-full">
              <BarChart 
                accessibilityLayer
                data={data.byDestino} 
                layout="vertical" 
                margin={{ left: 0, right: 30, top: 10, bottom: 0 }}
              >
                <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                    // Truncate
                    tickFormatter={(val) => val.length > 20 ? `${val.slice(0, 20)}...` : val}
                />
                <ChartTooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.2)', radius: 4}} 
                    content={<ChartTooltipContent indicator="dashed" />} 
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--color-value)" 
                  radius={[0, 4, 4, 0]} 
                  barSize={24}
                >
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
      </div>
    </div>
  )
}