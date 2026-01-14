import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LabelList
} from 'recharts'
import { TrendingUp, AlertTriangle, PieChart as PieIcon, Activity, UserPlus, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ObservatoryData } from '@/utils/pdfGenerator'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

// Componente de Card de Métrica (KPI)
function MetricCard({ title, value, icon: Icon, colorClass, bgClass }: any) {
  return (
    <Card className={cn("border-l-4 shadow-sm hover:shadow-md transition-shadow", colorClass.replace('text-', 'border-l-'))}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <h3 className={cn("text-2xl font-bold mt-1", colorClass)}>{value}</h3>
        </div>
        <div className={cn("p-3 rounded-full", bgClass)}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
      </CardContent>
    </Card>
  )
}

// Tooltip Customizado Unificado
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-popover-foreground text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-mono font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function OverviewSection({ data }: { data: ObservatoryData }) {
  const getUrgencyColor = (weight: number) => {
    if (weight >= 4) return '#ef4444'; // Red
    if (weight === 3) return '#f97316'; // Orange
    if (weight === 2) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  }

  // Cálculos Básicos
  const totalNovos = useMemo(() => data.evolutionData.reduce((acc, c) => acc + c.novos, 0), [data])
  const totalDesligados = useMemo(() => data.efficiencyData.totalClosed, [data])
  const totalRiscoAlto = useMemo(() => data.urgencyData.filter((u) => u.weight >= 3).reduce((acc, c) => acc + c.value, 0), [data])
  
  // [MODIFICADO] Lógica Avançada de Processamento para Tipificação
  // Separa strings compostas ("Violação A, Violação B") em contagens individuais
  const pieData = useMemo(() => {
    const rawCounts: Record<string, number> = {}

    data.violationData.forEach((item) => {
      // 1. Divide por vírgula se houver múltiplas
      const categories = item.name.split(',').map(s => s.trim())
      
      // 2. Itera e soma individualmente
      categories.forEach(cat => {
        if (cat) {
          // Soma o valor do item para cada categoria encontrada
          // (Ex: se item.value é 1 e tem 3 categorias, soma 1 para cada uma)
          rawCounts[cat] = (rawCounts[cat] || 0) + item.value
        }
      })
    })

    // 3. Reconstrói o array de dados
    const processedData = Object.entries(rawCounts).map(([name, value]) => ({ name, value }))

    // 4. Ordenação e Agrupamento (Lógica original)
    const sorted = processedData.sort((a, b) => b.value - a.value)
    
    if (sorted.length <= 5) return sorted
    
    const top5 = sorted.slice(0, 5)
    const outros = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0)
    return [...top5, { name: 'Outros', value: outros }]
  }, [data])

  // Recalcula a principal demanda baseada nos dados processados, não nos brutos
  const principalDemanda = pieData.length > 0 ? pieData[0].name : 'N/A'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. KPIs (Key Performance Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Novos Casos (6 Meses)" 
          value={totalNovos} 
          icon={UserPlus} 
          colorClass="text-blue-600" 
          bgClass="bg-blue-100 dark:bg-blue-900/20" 
        />
        <MetricCard 
          title="Casos Desligados" 
          value={totalDesligados} 
          icon={CheckCircle2} 
          colorClass="text-emerald-600" 
          bgClass="bg-emerald-100 dark:bg-emerald-900/20" 
        />
        <MetricCard 
          title="Alto Risco Ativo" 
          value={totalRiscoAlto} 
          icon={AlertTriangle} 
          colorClass="text-red-600" 
          bgClass="bg-red-100 dark:bg-red-900/20" 
        />
        <MetricCard 
          title="Principal Demanda" 
          value={<span className="text-lg truncate block max-w-[150px]" title={principalDemanda}>{principalDemanda}</span>} 
          icon={Activity} 
          colorClass="text-purple-600" 
          bgClass="bg-purple-100 dark:bg-purple-900/20" 
        />
      </div>

      {/* 2. Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Fluxo (Entradas x Saídas) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-blue-500"/> Fluxo de Atendimento
            </CardTitle>
            <CardDescription>Comparativo mensal de entradas e saídas.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.evolutionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5}/>
                <XAxis 
                  dataKey="name" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  allowDecimals={false} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}/>
                <Bar dataKey="novos" name="Novos Casos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="desligados" name="Desligamentos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Matriz de Risco */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-500"/> Matriz de Risco
            </CardTitle>
            <CardDescription>Distribuição dos casos ativos por gravidade.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.urgencyData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5}/>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }}/>
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} name="Quantidade">
                  <LabelList dataKey="value" position="right" fontSize={11} fontWeight="bold" fill="hsl(var(--foreground))" />
                  {data.urgencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getUrgencyColor(entry.weight)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipificação das Violações */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PieIcon className="h-4 w-4 text-purple-500"/> Tipificação das Violações
            </CardTitle>
            <CardDescription>Principais naturezas de violação identificadas (Contagem individual).</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={2} 
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  <LabelList 
                    dataKey="name" 
                    position="outside" 
                    fontSize={11} 
                    fill="hsl(var(--muted-foreground))" 
                    stroke="none" 
                    offset={20}
                  />
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', right: 0 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}