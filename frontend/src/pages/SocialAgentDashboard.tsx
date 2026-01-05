import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, UserCheck, FolderInput, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function AgentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/20" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-xl bg-muted/10 col-span-2" />
        <Skeleton className="h-64 rounded-xl bg-muted/10" />
      </div>
    </div>
  )
}

export function SocialAgentDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', 'agent'],
    queryFn: async () => (await api.get('/stats')).data,
  })

  // Busca a fila de espera real
  const { data: waitingList } = useQuery({
    queryKey: ['cases', 'waiting-triage'],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { status: 'AGUARDANDO_ACOLHIDA', pageSize: 5 } 
      })
      return res.data.data || res.data.items || []
    }
  })

  if (isLoading) return <AgentSkeleton />

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardStatCard
          index={0}
          title="Em Acolhida (Comigo)"
          value={stats?.myActiveCases}
          icon={Users}
          colorClass="text-blue-600"
          description="Casos em processo de escuta"
        />
        <DashboardStatCard
          index={1}
          title="Novos (Mês)"
          value={stats?.myNewCasesMonth}
          icon={FolderInput}
          colorClass="text-amber-600"
          description="Triagens iniciadas este mês"
        />
        <DashboardStatCard
          index={2}
          title="Finalizados (Mês)"
          value={stats?.myClosedMonth}
          icon={UserCheck}
          colorClass="text-emerald-600"
          description="Encaminhados ou arquivados"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Agenda (2 colunas) */}
        <div className="lg:col-span-2">
          <UpcomingAppointments />
        </div>

        {/* 3. Fila de Espera (Ação Imediata) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-l-4 border-l-primary shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Fila de Espera
              </CardTitle>
              <CardDescription>
                Cidadãos aguardando primeira escuta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              {waitingList && waitingList.length > 0 ? (
                waitingList.map((c: any) => (
                  <div key={c.id} className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors flex justify-between items-center group">
                    <div className="overflow-hidden">
                      <p className="font-medium truncate">{c.nomeCompleto}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="h-5 text-[10px] px-1">{c.urgencia || 'Normal'}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(c.dataEntrada), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Link to={ROUTES.CASE_DETAIL(c.id)}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                  <p>Nenhum caso na fila de espera.</p>
                </div>
              )}
            </CardContent>
            
            <div className="p-4 pt-0 mt-auto">
              {/* [CORREÇÃO] Link aponta para a página principal de casos (Meus Casos) */}
              <Link to={ROUTES.CASES}>
                <Button className="w-full" variant="secondary">
                  Ver Lista Completa
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}