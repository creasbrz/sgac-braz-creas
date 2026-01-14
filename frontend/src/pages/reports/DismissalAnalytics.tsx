// frontend/src/components/reports/DismissalAnalytics.tsx
import { useState, useMemo } from 'react'
import { useQuery } from "@tanstack/react-query"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts"
import { FileX, CheckCircle2, Ban, Download, AlertCircle, MapPin } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { api } from "@/lib/api"
import { generateDismissalPDF } from "@/utils/pdfGenerator"

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#64748b", "#ec4899", "#14b8a6"]

interface DismissalData {
  total: number
  byMotivo: { name: string; value: number }[]
  byDestino: { name: string; value: number }[]
  list: any[]
}

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

  const stats = useMemo(() => {
    if (!data || data.total === 0) return { successRate: 0, evasionRate: 0 }

    const total = data.total

    const successCount = data.byMotivo
      .filter(m => m.name.includes('Minimização') || m.name.includes('Autonomia'))
      .reduce((acc, curr) => acc + curr.value, 0)

    const evasionCount = data.byMotivo
      .filter(m => 
        m.name.includes('Recusa') || 
        m.name.includes('não localizado')
      )
      .reduce((acc, curr) => acc + curr.value, 0)

    return {
      successRate: Math.round((successCount / total) * 100),
      evasionRate: Math.round((evasionCount / total) * 100)
    }
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
      <div className="space-y-4">
        <div className="flex justify-end"><Skeleton className="h-9 w-40" /></div>
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
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro na Análise</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados. 
          <Button variant="link" className="p-0 h-auto ml-1 text-destructive underline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 text-center border-2 border-dashed rounded-xl bg-muted/5">
        <div className="p-4 bg-muted rounded-full">
          <FileX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nenhum desligamento registrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Não há registros históricos para o período selecionado.
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
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-lg font-semibold tracking-tight">Indicadores de Desligamento</h2>
            <p className="text-sm text-muted-foreground">Análise qualitativa dos encerramentos de casos.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
                <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">1 ano</SelectItem>
                    <SelectItem value="24">2 anos</SelectItem>
                    <SelectItem value="60">5 anos</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4"/>
                <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Desligamentos</CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
            <p className="text-xs text-muted-foreground">Casos encerrados no período</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso (Autonomia)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Minimização de riscos alcançada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Evasão</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.evasionRate}%</div>
            <p className="text-xs text-muted-foreground">Recusa ou não localização</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Motivos do Desligamento</CardTitle>
            <CardDescription>Distribuição proporcional por causa registrada</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byMotivo}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  // CORREÇÃO: Removido cálculo de x, y, cx, cy não usados
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                >
                  {data.byMotivo.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px' }}
                />
                <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '11px', maxWidth: '40%' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Destinos Pós-Alta</CardTitle>
                    <CardDescription>Encaminhamentos realizados.</CardDescription>
                </div>
                <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDestino} layout="vertical" margin={{ left: 5, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.5} />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={140} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    interval={0}
                />
                <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.byDestino.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}