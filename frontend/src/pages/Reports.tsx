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

// Correção: Adiciona uma assinatura de índice para compatibilidade com o Recharts
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
    queryKey: ['stats'],
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Casos por Nível de Urgência</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.casesByUrgency}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                   {stats.casesByUrgency.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Casos por Categoria de Público</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.casesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                  nameKey="name"
                  label
                >
                  {stats.casesByCategory.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Produtividade por Técnico</CardTitle>
            <CardDescription>Distribuição de casos por profissional responsável.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.productivity}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      <RmaReport />
    </div>
  )
}