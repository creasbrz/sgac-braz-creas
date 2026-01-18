// frontend/src/components/analytics/sections/NetworkSection.tsx
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts'
import { Share2, DoorOpen, BarChart3, LucideIcon } from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    originData?: ChartData[]
    networkData?: ChartData[]
  }
}

// --- CHART CONFIG (Theming) ---
const originChartConfig = {
  value: {
    label: "Casos",
    color: "hsl(var(--chart-4))", // Orange/Amber
  },
} satisfies ChartConfig

const networkChartConfig = {
  value: {
    label: "Encaminhamentos",
    color: "hsl(var(--chart-5))", // Indigo/Purple
  },
} satisfies ChartConfig

// --- SUB-COMPONENT: REUSABLE CHART WIDGET ---
interface ChartWidgetProps {
  title: string
  subtitle: string
  icon: LucideIcon
  data: ChartData[]
  config: ChartConfig
  variant?: 'orange' | 'indigo'
  emptyMessage?: string
}

function NetworkChartWidget({ 
  title, 
  subtitle, 
  icon: Icon, 
  data, 
  config, 
  variant = 'orange', 
  emptyMessage = "Sem dados registrados." 
}: ChartWidgetProps) {
  
  // Sort descending and take top 10
  const sortedData = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10)
  }, [data])

  const total = sortedData.reduce((acc, curr) => acc + curr.value, 0)

  // Dynamic visual styles based on variant
  const styles = {
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
  }
  const activeStyle = styles[variant]

  return (
    <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300 border-border/60">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className={cn("p-2 rounded-lg shrink-0", activeStyle)}>
                <Icon className="h-5 w-5" />
              </div>
              {title}
            </CardTitle>
            <CardDescription className="text-xs ml-1">{subtitle}</CardDescription>
          </div>
          
          <div className="text-right bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
            <span className="text-2xl font-bold block leading-none tabular-nums tracking-tight">
              {total}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-[350px] p-4 pt-2">
        {sortedData.length > 0 ? (
          <ChartContainer config={config} className="w-full h-[350px]">
            <BarChart
              accessibilityLayer
              data={sortedData}
              layout="vertical"
              margin={{ left: 0, right: 40, top: 10, bottom: 0 }}
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
                // Truncate long names but keep them readable
                tickFormatter={(val) => val.length > 18 ? `${val.slice(0, 18)}...` : val}
              />
              <ChartTooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }} 
                content={<ChartTooltipContent indicator="dashed" />} 
              />
              <Bar 
                dataKey="value" 
                radius={[0, 4, 4, 0]} 
                barSize={24}
                fill="var(--color-value)" // Uses the color defined in config
              >
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  className="fill-foreground font-bold text-xs" 
                  // [CORREÇÃO] Tipagem 'any' para satisfazer Recharts v3
                  formatter={(val: any) => val > 0 ? val : ''}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-60 min-h-[200px]">
            <div className="bg-muted p-4 rounded-full">
              <BarChart3 className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- MAIN COMPONENT ---
export function NetworkSection({ data }: NetworkSectionProps) {
  // Safe defaults
  const originData = data?.originData || []
  const networkData = data?.networkData || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. PORTA DE ENTRADA (Origem) */}
      <NetworkChartWidget 
        title="Porta de Entrada"
        subtitle="Origem das demandas recebidas"
        icon={DoorOpen}
        data={originData}
        config={originChartConfig}
        variant="orange"
        emptyMessage="Nenhuma origem registrada no período."
      />

      {/* 2. PORTA DE SAÍDA (Destino) */}
      <NetworkChartWidget 
        title="Porta de Saída"
        subtitle="Encaminhamentos realizados para a rede"
        icon={Share2}
        data={networkData}
        config={networkChartConfig}
        variant="indigo"
        emptyMessage="Nenhum encaminhamento realizado."
      />
      
    </div>
  )
}