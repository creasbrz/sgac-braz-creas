// frontend/src/components/analytics/sections/NetworkSection.tsx
import { useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts'
import { Share2, BarChart3, DoorOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- TIPOS AUXILIARES ---
interface ChartData {
  name: string
  value: number
}

// --- SUB-COMPONENTE: TOOLTIP CUSTOMIZADO ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-popover-foreground animate-in zoom-in-95 duration-200">
        <p className="text-sm font-semibold mb-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          Quantidade: <span className="font-mono font-bold text-primary">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

// --- SUB-COMPONENTE: WIDGET DE GRÁFICO REUTILIZÁVEL ---
interface ChartWidgetProps {
  title: string
  subtitle: string
  icon: any
  data: ChartData[]
  color: string
  emptyMessage?: string
}

function NetworkChartWidget({ title, subtitle, icon: Icon, data, color, emptyMessage = "Sem dados registrados no período." }: ChartWidgetProps) {
  // Ordena dados do maior para o menor para melhor visualização
  const sortedData = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10) // Top 10
  }, [data])

  const total = sortedData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <div className={cn("p-2 rounded-md bg-opacity-10", `bg-[${color}]/10 text-[${color}]`)} style={{ backgroundColor: `${color}1A`, color: color }}>
                <Icon className="h-5 w-5" />
              </div>
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">{subtitle}</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold block">{total}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-[350px] p-4 pt-0">
        {sortedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={350}>
            <BarChart 
              data={sortedData} 
              layout="vertical" 
              margin={{ left: 0, right: 30, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={140} 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false}
                // Trunca texto muito longo
                tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 4 }} />
              <Bar 
                dataKey="value" 
                fill={color} 
                radius={[0, 4, 4, 0]} 
                barSize={24}
                animationDuration={1000}
              >
                {/* Rótulo de valor na ponta da barra */}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  style={{ fontSize: '11px', fontWeight: 'bold', fill: 'hsl(var(--foreground))' }} 
                />
                {/* Gradiente sutil ou cor sólida */}
                {sortedData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} className="opacity-90 hover:opacity-100 transition-opacity" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-60">
            <div className="bg-muted p-4 rounded-full">
              <BarChart3 className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function NetworkSection({ data }: { data: any }) {
  // data deve conter originData e networkData
  // originData vem do backend (Item 2.1)
  // networkData pode vir de encaminhamentos (se implementado no backend também)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Gráfico 1: Origem (Órgãos Demandantes) */}
      <NetworkChartWidget 
        title="Porta de Entrada" 
        subtitle="Origem das demandas recebidas"
        icon={DoorOpen}
        data={data.originData || []} // Usa dados do backend
        color="#f97316" // Laranja
        emptyMessage="Nenhuma origem registrada."
      />

      {/* Gráfico 2: Destino (Encaminhamentos) */}
      <NetworkChartWidget 
        title="Porta de Saída" 
        subtitle="Encaminhamentos realizados para a rede"
        icon={Share2}
        data={data.networkData || []} // Se o backend mandar, usa. Senão, vazio.
        color="#6366f1" // Índigo
        emptyMessage="Nenhum encaminhamento realizado."
      />
      
    </div>
  )
}