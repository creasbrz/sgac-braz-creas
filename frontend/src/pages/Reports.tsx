// frontend/src/pages/Reports.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { RmaReport } from '@/components/RmaReport'

// Define compatibilidade e previne crash
interface StatData {
  name: string
  value: number
  [key: string]: any
}

interface Stats {
  totalCases: number
  acolhidasCount: number
  acompanhamentosCount: number
  casesByViolation: StatData[]
  casesByCategory: StatData[]
  casesByUrgency: StatData[]
  productivity: StatData[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0']

export function Reports() {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<Stats>({
    queryKey: ['reports-stats'], // Correção: evita colisão de cache
    queryFn: async () => {
      const response = await api.get('/stats')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="p-8 text-center text-destructive">
        Falha ao carregar as estatísticas.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Painel Gerencial</h1>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Casos</CardTitle>
            <CardDescription>Número total de casos no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.totalCases}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acolhidas</CardTitle>
            <CardDescription>Casos atualmente em acolhida.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.acolhidasCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acompanhamentos</CardTitle>
            <CardDescription>Casos atualmente em PAEFI.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.acompanhamentosCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Casos por Urgência */}
        <Card>
          <CardHeader>
            <CardTitle>Casos por Nível de Urgência</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.casesByUrgency.length === 0 ? (
              <p className="text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.casesByUrgency}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value">
                    {stats.casesByUrgency.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Casos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Casos por Categoria de Público</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.casesByCategory.length === 0 ? (
              <p className="text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.casesByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                    labelLine={false}
                    dataKey="value"
                    nameKey="name"
                  >
                    {stats.casesByCategory.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produtividade */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade por Técnico</CardTitle>
          <CardDescription>
            Distribuição de casos por profissional responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.productivity.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.productivity}>
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="value">
                  {stats.productivity.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Relatório RMA */}
      <RmaReport />
    </div>
  )
}
