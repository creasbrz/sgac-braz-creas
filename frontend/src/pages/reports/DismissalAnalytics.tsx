import { useQuery } from "@tanstack/react-query"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts"
import { FileX, CheckCircle2, Ban, Download } from "lucide-react" // [NOVO] Download icon
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button" // [NOVO] Button
import { generateDismissalPDF } from "@/utils/pdfGenerator" // [NOVO] Generator

// Cores para os gráficos
const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#64748b"]

interface ChartData {
  name: string
  value: number
  [key: string]: any
}

interface AnalyticsData {
  total: number
  byReason: ChartData[]
  monthlyTrend: ChartData[]
}

const MOCK_DATA: AnalyticsData = {
  total: 42,
  byReason: [
    { name: "Conclusão de PAEFI", value: 18 },
    { name: "Evasão / Recusa", value: 8 },
    { name: "Mudança de Município", value: 7 },
    { name: "Óbito", value: 3 },
    { name: "Encaminhamento Outra Pol.", value: 4 },
    { name: "Outros", value: 2 },
  ],
  monthlyTrend: [
    { name: "Jan", value: 2 },
    { name: "Fev", value: 4 },
    { name: "Mar", value: 3 },
    { name: "Abr", value: 8 },
    { name: "Mai", value: 5 },
    { name: "Jun", value: 6 },
  ]
}

export function DismissalAnalytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["reports", "dismissals"],
    queryFn: async () => {
      // Simulação
      return new Promise(resolve => setTimeout(() => resolve(MOCK_DATA), 800))
    },
    initialData: MOCK_DATA 
  })

  // [NOVO] Handler Export
  const handleExport = () => {
    if (!data) return
    generateDismissalPDF({
      periodo: "Último Semestre",
      total: data.total,
      successRate: 42, // Mock, idealmente viria do backend
      evasionRate: 19, // Mock
      byReason: data.byReason,
      monthlyTrend: data.monthlyTrend
    })
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* [NOVO] Toolbar Superior */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4"/> Exportar Relatório de Desligamentos
        </Button>
      </div>

      {/* KPIs de Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Desligamentos</CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>
        
        {/* ... Demais cards (mantidos iguais) ... */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">42%</div>
            <p className="text-xs text-muted-foreground">Conclusão efetiva de plano</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Índice de Evasão</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">19%</div>
            <p className="text-xs text-muted-foreground">Recusa ou abandono</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ... Gráficos mantidos iguais ... */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Motivos do Desligamento</CardTitle>
            <CardDescription>Distribuição quantitativa por causa registrada.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byReason}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.byReason.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Evolução Temporal</CardTitle>
            <CardDescription>Volume de saídas por mês.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}