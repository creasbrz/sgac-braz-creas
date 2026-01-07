import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, ArrowRight, AlertCircle, Clock, Calendar, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'

const AgentStatCard = ({ title, value, icon: Icon, colorClass, borderClass, bgClass, description }: any) => (
  <Card className={`overflow-hidden shadow-sm hover:shadow-md transition-all relative border-l-4 ${borderClass} bg-card`}>
    <div className="p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
        <div className="text-3xl font-bold text-foreground">{value || 0}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>
      </div>
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
    </div>
  </Card>
)

export function SocialAgentDashboard() {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['workspace-summary'],
    queryFn: async () => (await api.get('/workspace/summary')).data,
    refetchInterval: 1000 * 60 * 5
  })

  const { data: waitingList } = useQuery({
    queryKey: ['cases', 'waiting-triage'],
    queryFn: async () => {
      const res = await api.get('/cases', { params: { status: 'AGUARDANDO_ACOLHIDA', pageSize: 5 } })
      return res.data.data || []
    }
  })

  if (isError) return <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md">Erro ao carregar dados.</div>
  
  if (isLoading) return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl"/>)}</div>
       <div className="grid lg:grid-cols-3 gap-6"><Skeleton className="h-64 lg:col-span-2"/><Skeleton className="h-64"/></div>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AgentStatCard 
          title="Para Iniciar" 
          value={summary?.detailedStats?.meusAguardando} 
          icon={AlertCircle} 
          colorClass="text-purple-600 dark:text-purple-400" 
          bgClass="bg-purple-100 dark:bg-purple-900/30"
          borderClass="border-purple-600 dark:border-purple-500"
          description="Sua fila de entrada" 
        />

        <AgentStatCard 
          title="Em Acolhida" 
          value={summary?.detailedStats?.meusEmAtendimento} 
          icon={Users} 
          colorClass="text-blue-600 dark:text-blue-400" 
          bgClass="bg-blue-100 dark:bg-blue-900/30"
          borderClass="border-blue-600 dark:border-blue-500"
          description="Em andamento" 
        />

        <AgentStatCard 
          title="Hoje" 
          value={summary?.appointments?.length} 
          icon={Calendar} 
          colorClass="text-emerald-600 dark:text-emerald-400" 
          bgClass="bg-emerald-100 dark:bg-emerald-900/30"
          borderClass="border-emerald-600 dark:border-emerald-500"
          description="Compromissos agendados" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Agenda (Ocupa 2 colunas) */}
        <div className="lg:col-span-2">
          {/* [OTIMIZAÇÃO] Passando dados do summary para evitar fetch extra */}
          {/* Limitamos a 5 itens e usamos "Hoje" pois vem do workspace summary */}
          <UpcomingAppointments 
             data={summary?.appointments?.slice(0, 5)} 
             title="Agenda de Hoje"
          />
        </div>

        {/* 3. Minha Fila de Espera */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full shadow-sm flex flex-col bg-card border-l-4 border-l-purple-500">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Clock className="h-5 w-5" /> Minha Fila
              </CardTitle>
              <CardDescription>Aguardando sua ação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 pt-4">
              {waitingList && waitingList.length > 0 ? (
                waitingList.slice(0, 5).map((c: any) => (
                  <Link key={c.id} to={ROUTES.CASE_DETAIL(c.id)}>
                    <div className="p-3 border rounded-lg bg-background hover:bg-muted/50 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex justify-between items-center group cursor-pointer shadow-sm">
                      <div className="overflow-hidden">
                        <p className="font-medium truncate text-sm text-foreground">{c.nomeCompleto}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="secondary" className="h-5 text-[10px] px-1 bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                             {c.urgencia || 'Normal'}
                          </Badge>
                          <span className="text-[11px]">
                             há {formatDistanceToNow(new Date(c.dataEntrada), { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover:text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed text-sm">
                   <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-20"/>
                   Sua fila está vazia.
                </div>
              )}
            </CardContent>
            <div className="p-4 mt-auto border-t border-border/50">
              <Link to={ROUTES.WAITING_LIST}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold">
                   Iniciar Atendimentos
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}