// frontend/src/components/analytics/sections/NetworkSection.tsx
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts'
import { 
  Share2, 
  DoorOpen, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileInput,
  type LucideIcon 
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'

import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart"

// --- UTILS ---
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- TYPES ---
interface ChartData {
  name: string
  value: number
}

interface NetworkSectionProps {
  data: {
    originData?: ChartData[]     // Porta de Entrada (Órgãos)
    networkData?: ChartData[]    // Porta de Saída (Encaminhamentos)
    entryTypeData?: ChartData[]  // Tipo de Entrada (Modalidade)
  }
}

// --- CHART CONFIGURATION ---
const chartConfig = {
  origins: {
    label: "Origem",
    color: "hsl(var(--chart-4))", // Laranja (Amber)
  },
  network: {
    label: "Destino",
    color: "hsl(var(--chart-2))", // Verde (Emerald)
  },
  types: {
    label: "Modalidade",
    color: "hsl(var(--chart-1))", // Azul (Primary)
  }
} satisfies ChartConfig

// --- SUB-COMPONENT: REUSABLE WIDGET ---
interface NetworkWidgetProps {
  title: string
  subtitle: string
  icon: LucideIcon
  data: ChartData[]
  variant: 'entry' | 'exit' | 'type'
}

function NetworkChartWidget({ 
  title, 
  subtitle, 
  icon: Icon, 
  data, 
  variant
}: NetworkWidgetProps) {
  
  // Processamento de dados: Top 10 + Ordenação
  const { sortedData, total } = useMemo(() => {
    if (!data?.length) return { sortedData: [], total: 0 }
    
    // Para 'type' (poucas categorias), não precisamos limitar tanto, mas mantemos a ordenação
    const sorted = [...data]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    const sum = sorted.reduce((acc, curr) => acc + curr.value, 0)
    
    return { sortedData: sorted, total: sum }
  }, [data])

  // Estilos Dinâmicos baseados na variante
  const styles = {
    entry: {
      iconBg: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
      trendIcon: ArrowDownLeft,
      barColor: "var(--color-origins)" 
    },
    exit: {
      iconBg: "bg-status-success-bg text-status-success-fg border-status-success-border",
      trendIcon: ArrowUpRight,
      barColor: "var(--color-network)"
    },
    type: {
      iconBg: "bg-status-info-bg text-status-info-fg border-status-info-border",
      trendIcon: FileInput,
      barColor: "var(--color-types)"
    }
  }

  const activeStyle = styles[variant]
  const TrendIcon = activeStyle.trendIcon

  return (
    <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300 border relative group overflow-hidden">
      {/* Faixa decorativa lateral */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity bg-current", activeStyle.iconBg.split(' ')[1])} />

      <CardHeader className="pb-2 border-b border-border/40 bg-muted/5">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg shrink-0 border shadow-sm", activeStyle.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-foreground tracking-tight">
                {title}
              </CardTitle>
            </div>
            <CardDescription className="text-xs max-w-55 leading-relaxed line-clamp-2">
              {subtitle}
            </CardDescription>
          </div>
          
          {/* KPI Badge */}
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md border shadow-sm">
                <TrendIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xl font-bold tabular-nums tracking-tight leading-none">
                  {total}
                </span>
             </div>
             <span className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wide">
               Total
             </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {sortedData.length > 0 ? (
          <div className="p-4 pt-6 pl-0">
            <ChartContainer config={chartConfig} className="w-full h-80">
              <BarChart
                accessibilityLayer
                data={sortedData}
                layout="vertical"
                margin={{ left: 0, right: 35, top: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} stroke="hsl(var(--border))" />
                
                <XAxis type="number" hide />
                
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140} 
                  tickLine={false}
                  axisLine={false}
                  tick={{ 
                    fontSize: 11, 
                    fill: 'hsl(var(--muted-foreground))', 
                    fontWeight: 500,
                    textAnchor: 'end',
                    dy: 4 
                  }}
                  tickFormatter={(val) => val.length > 20 ? `${val.slice(0, 20)}...` : val}
                />
                
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.3)', radius: 4 }}
                  content={
                    <ChartTooltipContent 
                      indicator="line" 
                      className="min-w-37.5"
                      labelClassName="font-bold text-foreground"
                    />
                  }
                />
                
                <Bar
                  dataKey="value"
                  fill={activeStyle.barColor}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  animationDuration={1000}
                >
                  <LabelList
                    dataKey="value"
                    position="right"
                    offset={8}
                    className="fill-foreground font-bold text-[11px]"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
            <div className="bg-muted/30 p-4 rounded-full ring-1 ring-border/50">
              <BarChart3 className="h-8 w-8 opacity-60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground/70">Sem dados</p>
              <p className="text-xs max-w-45">Nenhum registro para este indicador.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- MAIN COMPONENT ---
export function NetworkSection({ data }: NetworkSectionProps) {
  const originData = data?.originData || []
  const networkData = data?.networkData || []
  const entryTypeData = data?.entryTypeData || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards">
      
      {/* 1. PORTA DE ENTRADA (Órgãos) */}
      <NetworkChartWidget 
        title="Porta de Entrada"
        subtitle="Principais órgãos demandantes."
        icon={DoorOpen}
        data={originData}
        variant="entry"
      />

      {/* 2. TIPO DE ENTRADA (Modalidade) */}
      <NetworkChartWidget 
        title="Tipo de Entrada"
        subtitle="Modalidade de acesso (Espontânea, Busca Ativa, etc)."
        icon={FileInput}
        data={entryTypeData}
        variant="type"
      />

      {/* 3. PORTA DE SAÍDA (Rede) */}
      <NetworkChartWidget 
        title="Rede de Apoio"
        subtitle="Encaminhamentos realizados para a rede."
        icon={Share2}
        data={networkData}
        variant="exit"
      />
      
    </div>
  )
}