import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Activity, CheckCircle, Clock, AlertTriangle, ArrowRight, FileWarning } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

interface SpecialistStats {
  role: 'Especialista'
  myActiveCases: number
  myClosedMonth: number
  myNewCasesMonth: number
}

// Interface baseada na rota /alerts do backend
interface Alert {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'warning' | 'info'
}

function TechnicianSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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

export function TechnicianDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<SpecialistStats>({
    queryKey: ['stats', 'specialist'],
    queryFn: async () => (await api.get('/stats')).data,
  })

  // [NOVO] Integração com rota de Alertas Inteligentes
  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => (await api.get('/alerts')).data,
  })

  const isLoading = statsLoading || alertsLoading

  if (isLoading) return <TechnicianSkeleton />

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardStatCard
          index={0}
          title="Casos em Acompanhamento"
          value={stats?.myActiveCases}
          icon={Activity}
          colorClass="text-blue-600"
          description="Famílias ativas no PAEFI"
        />
        <DashboardStatCard
          index={1}
          title="Novos (Mês Atual)"
          value={stats?.myNewCasesMonth}
          icon={Clock}
          colorClass="text-amber-600"
          description="Casos atribuídos recentemente"
        />
        <DashboardStatCard
          index={2}
          title="Desligamentos (Mês)"
          value={stats?.myClosedMonth}
          icon={CheckCircle}
          colorClass="text-emerald-600"
          description="Casos finalizados com sucesso"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Agenda (Ocupa 2 colunas) */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <UpcomingAppointments />
        </motion.div>

        {/* 3. Central de Alertas (NOVO) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {alerts && alerts.length > 0 ? (
                alerts.filter(a => a.type !== 'info').slice(0, 5).map((alert) => (
                  <div key={alert.id} className="bg-muted/30 p-3 rounded-lg border text-sm hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-semibold ${alert.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                        {alert.title}
                      </span>
                      {alert.type === 'critical' && <Badge variant="destructive" className="h-5 text-[10px]">Urgente</Badge>}
                    </div>
                    <p className="text-muted-foreground mb-2 line-clamp-2">{alert.description}</p>
                    <Link to={alert.link}>
                      <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                        Resolver <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto text-emerald-500/20 mb-2" />
                  <p>Tudo em dia! Nenhuma pendência crítica.</p>
                </div>
              )}
              
              <Link to="/dashboard/cases">
                <Button variant="outline" className="w-full mt-2">
                  <FileWarning className="mr-2 h-4 w-4" /> Ver Todos os Casos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}