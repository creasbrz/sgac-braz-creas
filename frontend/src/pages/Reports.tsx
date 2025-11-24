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

// Interface flexível para o Recharts
interface StatData {
  name: string
  value: number
  [key: string]: any
}

// Interface completa da resposta da API /stats
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
  const { data: stats, isLoading, isError } = useQuery<Stats>({
    queryKey: ['reports-stats'],
    queryFn: async () => {
      const response = await api.get('/stats')
      return response.data
    },
    // [CORREÇÃO] Removemos keepPreviousData que não existe na versão nova do React Query
    staleTime: 1000 * 60 * 5, 
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="p-8 text-center text-destructive border border-destructive/20 rounded-lg bg-destructive/5 mt-4">
        Falha ao carregar as estatísticas. Verifique sua conexão.
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight">Painel Gerencial</h1>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Casos</CardTitle>
            <CardDescription>Histórico completo da unidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{stats.totalCases}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em Acolhida</CardTitle>
            <CardDescription>Casos aguardando ou em triagem.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-amber-500">{stats.acolhidasCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Em PAEFI</CardTitle>
            <CardDescription>Casos em acompanhamento técnico.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-600">{stats.acompanhamentosCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Perfil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Urgência */}
        <Card>
          <CardHeader>
            <CardTitle>Nível de Urgência</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                <BarChart data={stats.casesByUrgency} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    angle={-25} 
                    textAnchor="end"
                    interval={0} 
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {/* [CORREÇÃO] Adicionado tipagem explícita (_entry: any) */}
                    {stats.casesByUrgency.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Público Atendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                <PieChart>
                  <Pie
                    data={stats.casesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {/* [CORREÇÃO] Adicionado tipagem explícita (_entry: any) */}
                    {stats.casesByCategory.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtividade */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade por Técnico</CardTitle>
          <CardDescription>Volume total de casos sob responsabilidade.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
              <BarChart data={stats.productivity} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12} 
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                  {/* [CORREÇÃO] Adicionado tipagem explícita (_entry: any) */}
                  {stats.productivity.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Componente RMA Separado */}
      <RmaReport />
    </div>
  )
}