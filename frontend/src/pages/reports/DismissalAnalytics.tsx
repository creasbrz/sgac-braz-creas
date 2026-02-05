// frontend/src/pages/reports/DismissalAnalytics.tsx
import { useState, useMemo } from 'react'
import { useQuery } from "@tanstack/react-query"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, LabelList, Cell, Label
} from "recharts"
import { FileX, CheckCircle2, Ban, MapPin, PieChart as PieIcon, AlertTriangle, Download, FileOutput } from "lucide-react"
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// [CORREÇÃO] Removido CardFooter não utilizado
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart"

import { api } from "@/lib/api"

// Imports de PDF e Tipos
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { DismissalDoc } from '@/components/reports/templates/DismissalDoc'
import type { DismissalReportData } from '@/types/case'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CONFIGURAÇÃO DOS GRÁFICOS ---
const chartConfig = {
  cases: {
    label: "Casos",
  },
} satisfies ChartConfig

// --- COMPONENTE DE CARD LOCAL (Design System) ---
interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: any
  variant?: 'default' | 'success' | 'error' | 'warning'
}

const StatCard = ({ title, value, description, icon: Icon, variant = 'default' }: StatCardProps) => {
  const variants = {
    default: {
      container: "border-border/60",
      icon: "text-primary bg-primary/10",
      stripe: "bg-primary"
    },
    success: {
      container: "border-status-success-border",
      icon: "text-status-success-fg bg-status-success-bg",
      stripe: "bg-status-success-fg"
    },
    error: {
      container: "border-status-error-border",
      icon: "text-status-error-fg bg-status-error-bg",
      stripe: "bg-status-error-fg"
    },
    warning: {
      container: "border-status-warning-border",
      icon: "text-status-warning-fg bg-status-warning-bg",
      stripe: "bg-status-warning-fg"
    },
  }

  const style = variants[variant] || variants.default

  return (
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border relative group", style.container)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.75 opacity-0 group-hover:opacity-100 transition-opacity", style.stripe)} />
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 relative z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
            <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          </div>
          <div className={cn("p-3 rounded-xl transition-colors border shadow-sm", style.icon)}>
            <Icon className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground font-medium mt-3">{description}</p>
        )}
      </div>
    </Card>
  )
}

// Interface interna da Resposta da API
interface DismissalApiResponse {
  total: number
  byMotivo: { name: string; value: number }[]
  byDestino: { name: string; value: number }[]
  list: any[]
}

export function DismissalAnalytics() {
  const [months, setMonths] = useState(12)

  const { data, isLoading, isError, refetch } = useQuery<DismissalApiResponse>({
    queryKey: ["reports", "dismissals", months],
    queryFn: async () => {
      const response = await api.get("/reports/dismissals", { params: { months } })
      return response.data
    },
    retry: 1
  })

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

  const pdfData: DismissalReportData | null = useMemo(() => {
    if (!data) return null;
    return {
      periodo: `Últimos ${months} meses`,
      total: data.total,
      successRate: stats.successRate,
      evasionRate: stats.evasionRate,
      byReason: data.byMotivo || [],   
      monthlyTrend: data.byDestino || [] 
    }
  }, [data, months, stats]);

  const reasonData = useMemo(() => {
    if (!data?.byMotivo) return []
    return data.byMotivo.map((item, index) => ({
      ...item,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-6 p-1 animate-pulse">
        <div className="flex justify-between items-center">
           <Skeleton className="h-8 w-48 rounded-lg" />
           <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* [CORREÇÃO] h-[400px] -> h-100 */}
          <Skeleton className="h-100 w-full rounded-xl" />
          <Skeleton className="h-100 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-status-error-border rounded-xl bg-status-error-bg/10 text-status-error-fg animate-in fade-in">
        <div className="text-center p-6">
          <div className="bg-status-error-bg p-3 rounded-full inline-flex mb-3">
             <AlertTriangle className="h-8 w-8 text-status-error-fg" />
          </div>
          <h3 className="text-lg font-bold mb-1">Erro na Análise</h3>
          <p className="text-sm opacity-80 mb-4">Não foi possível carregar os dados de desligamento.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-status-error-border hover:bg-status-error-bg">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center border border-dashed border-border rounded-xl bg-muted/5 animate-in fade-in">
        <div className="p-4 bg-muted/30 rounded-full">
          <FileX className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum desligamento</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Não há registros de casos encerrados para o período de {months} meses.
          </p>
        </div>
        <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            {/* [CORREÇÃO] w-[180px] -> w-45 */}
            <SelectTrigger className="w-45 bg-background">
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
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <div className="p-2 bg-status-neutral-bg rounded-lg border border-status-neutral-border">
                   <FileOutput className="h-5 w-5 text-status-neutral-fg" />
                </div>
                Indicadores de Desligamento
            </h2>
            <p className="text-sm text-muted-foreground mt-1 pl-1">Análise qualitativa dos encerramentos e destinos pós-alta.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
                {/* [CORREÇÃO] sm:w-[140px] -> sm:w-35 */}
                <SelectTrigger className="w-full sm:w-35 h-9 bg-background">
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">1 ano</SelectItem>
                    <SelectItem value="24">2 anos</SelectItem>
                    <SelectItem value="60">5 anos</SelectItem>
                </SelectContent>
            </Select>
            
            {/* Botão de PDF */}
            {pdfData && (
              <PDFDownloadButton 
                document={<DismissalDoc data={pdfData} />}
                fileName={`Desligamentos_${months}meses.pdf`}
                label="PDF"
                variant="outline"
                size="sm"
                className="h-9 shadow-sm"
                icon={<Download className="h-4 w-4" />}
              />
            )}
        </div>
      </div>

      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total de Desligamentos" 
          value={data.total} 
          description="Casos encerrados no período"
          icon={FileX} 
          variant="default" 
        />
        <StatCard 
          title="Taxa de Sucesso" 
          value={`${stats.successRate}%`} 
          description="Autonomia alcançada (Minimização)"
          icon={CheckCircle2} 
          variant="success" 
        />
        <StatCard 
          title="Taxa de Evasão" 
          value={`${stats.evasionRate}%`} 
          description="Recusa ou não localizado"
          icon={Ban} 
          variant="error" 
        />
      </div>

      {/* 2. CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Motivos (Donut Chart Moderno) */}
        <Card className="flex flex-col shadow-sm border-border/60 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary"/> Motivos do Desligamento
            </CardTitle>
            <CardDescription className="text-xs">Distribuição proporcional por causa de encerramento.</CardDescription>
          </CardHeader>
          {/* [CORREÇÃO] min-h-[350px] -> min-h-87.5 */}
          <CardContent className="flex-1 min-h-87.5 p-6">
            {/* [CORREÇÃO] max-h-[300px] -> max-h-75 */}
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-75 w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={reasonData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70} 
                  strokeWidth={4}
                  stroke="hsl(var(--background))" 
                  paddingAngle={2}
                >
                  {reasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  
                  {/* [CORREÇÃO] Label Centralizado com coordenadas explícitas do viewBox */}
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
                              dy="-0.5em" /* Ajuste fino vertical para o número */
                              className="fill-foreground text-4xl font-bold tracking-tighter"
                            >
                              {data.total}
                            </tspan>
                            <tspan 
                              x={viewBox.cx} 
                              y={viewBox.cy} 
                              dy="1.5em" /* Ajuste fino vertical para o texto */
                              className="fill-muted-foreground text-xs font-semibold uppercase tracking-wider"
                            >
                              CASOS
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <ChartLegend 
                  content={<ChartLegendContent nameKey="name" payload={[]} />} 
                  className="-translate-y-2 flex-wrap gap-2 text-xs font-medium mt-4" 
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Destinos (Bar Chart Horizontal) */}
        <Card className="flex flex-col shadow-sm border-border/60 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500"/> Destinos Pós-Alta
                    </CardTitle>
                    <CardDescription className="text-xs">Encaminhamentos realizados após o desligamento.</CardDescription>
                </div>
            </div>
          </CardHeader>
          {/* [CORREÇÃO] min-h-[350px] -> min-h-87.5 */}
          <CardContent className="flex-1 min-h-87.5 p-6">
            {/* [CORREÇÃO] max-h-[300px] -> max-h-75 */}
            <ChartContainer config={chartConfig} className="w-full h-full max-h-75">
              <BarChart 
                accessibilityLayer
                data={data.byDestino} 
                layout="vertical" 
                margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                    // Truncate longo
                    tickFormatter={(val) => val.length > 18 ? `${val.slice(0, 18)}...` : val}
                />
                <ChartTooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.2)', radius: 4}} 
                    content={<ChartTooltipContent indicator="line" />} 
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--chart-2))" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  className="opacity-90 hover:opacity-100 transition-opacity"
                >
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    className="fill-foreground font-bold text-xs" 
                    formatter={(val: any) => Number(val) > 0 ? val : ''}
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