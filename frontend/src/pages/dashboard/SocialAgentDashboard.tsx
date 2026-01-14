import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Users, ArrowRight, AlertCircle, Clock, Calendar, 
  UserCheck, LucideIcon, Briefcase 
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'

import { ROUTES } from '@/constants/app-routes'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
interface StatCardProps {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  variant?: 'purple' | 'blue' | 'emerald' | 'default'
}

interface CaseItem {
  id: string
  nomeCompleto: string
  urgencia: string
  dataEntrada: string
}

// --- COMPONENTS ---

const AgentStatCard = ({ title, value, icon: Icon, description, variant = 'default' }: StatCardProps) => {
  const variants = {
    default: "text-primary bg-primary/10 border-primary/20",
    purple: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    blue: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  }

  const activeStyle = variants[variant]

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-border/60 group">
      <div className="p-6 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground font-medium pt-1 line-clamp-1">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl transition-colors border", activeStyle)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}

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

  // --- LOADING STATES ---
  if (isLoading) return (
    <div className="space-y-6 p-1 animate-pulse">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl w-full"/>)}
       </div>
       <div className="grid lg:grid-cols-3 gap-6">
         <Skeleton className="h-[400px] lg:col-span-2 rounded-xl"/>
         <Skeleton className="h-[400px] rounded-xl"/>
       </div>
    </div>
  )

  // --- ERROR STATE ---
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 p-6 text-center border border-dashed rounded-lg bg-muted/30">
      <AlertCircle className="h-10 w-10 text-destructive mb-3" />
      <p className="text-sm font-medium text-destructive">Não foi possível carregar o painel.</p>
    </div>
  )

  // Container Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 p-1"
    >
      
      {/* 1. KPIs SECTION */}
      <section aria-label="Métricas Principais">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div variants={itemVariants}>
            <AgentStatCard 
              title="Para Iniciar" 
              value={summary?.detailedStats?.meusAguardando || 0} 
              icon={Briefcase} 
              variant="purple"
              description="Casos na sua fila de entrada" 
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AgentStatCard 
              title="Em Acolhida" 
              value={summary?.detailedStats?.meusEmAtendimento || 0} 
              icon={Users} 
              variant="blue"
              description="Atendimentos em andamento" 
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AgentStatCard 
              title="Compromissos Hoje" 
              value={summary?.appointments?.length || 0} 
              icon={Calendar} 
              variant="emerald"
              description="Agendados para o dia" 
            />
          </motion.div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* 2. AGENDA (Maior prioridade visual) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 h-full">
          <UpcomingAppointments 
             data={summary?.appointments?.slice(0, 5)} 
             title="Minha Agenda do Dia"
             enableScroll={false}
             className="h-full min-h-[400px]" // Garante altura consistente
          />
        </motion.div>

        {/* 3. MINHA FILA DE AÇÃO */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full flex flex-col shadow-sm border-border/60 bg-card">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" /> 
                  </div>
                  Minha Fila
                </CardTitle>
                <Badge variant="outline" className="text-xs font-normal">
                  {waitingList?.length || 0} aguardando
                </Badge>
              </div>
              <CardDescription className="line-clamp-1">
                Usuários aguardando sua primeira escuta.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              {waitingList && waitingList.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {waitingList.slice(0, 5).map((c: CaseItem) => (
                    <li key={c.id}>
                      <Link to={ROUTES.CASE_DETAIL(c.id)} className="block group">
                        <div className="p-4 hover:bg-muted/40 transition-colors flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {c.nomeCompleto}
                              </p>
                              {c.urgencia && (
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border",
                                  c.urgencia === 'GRAVISSIMA' ? "bg-red-100 text-red-700 border-red-200" :
                                  c.urgencia === 'MUITO_GRAVE' ? "bg-orange-100 text-orange-700 border-orange-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  {c.urgencia}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>
                                  aguardando há {formatDistanceToNow(new Date(c.dataEntrada), { locale: ptBR })}
                                </span>
                            </div>
                          </div>
                          
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                            <ArrowRight className="h-4 w-4" />
                            <span className="sr-only">Ver caso</span>
                          </Button>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground gap-3">
                   <div className="p-4 bg-muted/50 rounded-full">
                     <UserCheck className="h-8 w-8 opacity-40"/>
                   </div>
                   <p className="text-sm font-medium">Sua fila está vazia</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-4 border-t bg-muted/5">
              <Link to={ROUTES.WAITING_LIST} className="w-full">
                <Button className="w-full gap-2 shadow-sm" variant="default">
                   <Briefcase className="h-4 w-4" />
                   Iniciar Triagem
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}