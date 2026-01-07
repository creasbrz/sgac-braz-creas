import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Briefcase, Activity } from 'lucide-react'

export function TeamProductionTab() {
  const { data: workloadData, isLoading } = useQuery({
    queryKey: ['productivity', 'workload'],
    queryFn: async () => (await api.get('/stats/productivity', { params: { mode: 'workload' } })).data
  })

  const { data: performanceData } = useQuery({
    queryKey: ['productivity', 'performance'],
    queryFn: async () => (await api.get('/stats/productivity', { params: { mode: 'performance', months: 3 } })).data
  })

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64"/><Skeleton className="h-64"/></div>

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2">
      
      {/* Cards de Desempenho (Casos Movimentados) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> Fluxo de Trabalho (Últimos 3 meses)</CardTitle>
            <CardDescription>Casos únicos movimentados por técnico.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData || []} layout="vertical" margin={{ left: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false}/>
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}}/>
                   <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Casos Movimentados" />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary"/> Carga de Trabalho Atual</CardTitle>
            <CardDescription>Distribuição da carteira ativa.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {workloadData?.slice(0, 5).map((user: any, idx: number) => (
                   <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {user.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.role}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <Badge variant="secondary" className="bg-blue-50 text-blue-700">Ativos: {user.active}</Badge>
                         <Badge variant="outline">Monit: {user.monitoring}</Badge>
                      </div>
                   </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}