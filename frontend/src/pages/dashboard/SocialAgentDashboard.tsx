// frontend/src/pages/dashboard/SocialAgentDashboard.tsx
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
  // Mapeamento para Tokens Semânticos
  const variants = {
    default: {
      container: "bg-primary/5 border-primary/20",
      icon: "text-primary bg-background border-primary/20",
      text: "text-primary",
      stripe: "bg-primary"
    },
    purple: {
      // Usando Status AI (Violet)
      container: "bg-status-ai-bg/50 border-status-ai-border",
      icon: "text-status-ai-fg bg-status-ai-bg border-status-ai-border",
      text: "text-status-ai-fg",
      stripe: "bg-status-ai-fg"
    },
    blue: {
      // Usando Status Info (Blue)
      container: "bg-status-info-bg/50 border-status-info-border",
      icon: "text-status-info-fg bg-status-info-bg border-status-info-border",
      text: "text-status-info-fg",
      stripe: "bg-status-info-fg"
    },
    emerald: {
      // Usando Status Success (Emerald)
      container: "bg-status-success-bg/50 border-status-success-border",
      icon: "text-status-success-fg bg-status-success-bg border-status-success-border",
      text: "text-status-success-fg",
      stripe: "bg-status-success-fg"
    },
  }

  const style = variants[variant]

  return (
    <Card className={cn("overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border relative group", style.container)}>
      {/* Faixa lateral colorida no hover */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-0.75 opacity-0 group-hover:opacity-100 transition-opacity", style.stripe)} />
      
      <div className="p-6 flex items-start justify-between">
        <div className="space-y-1 relative z-10">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground font-medium pt-1 line-clamp-1">{description}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl transition-colors border shadow-sm", style.icon)}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
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
         <Skeleton className="h-100 lg:col-span-2 rounded-xl"/>
         <Skeleton className="h-100 rounded-xl"/>
       </div>
    </div>
  )

  // --- ERROR STATE ---
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 p-6 text-center border border-dashed rounded-lg bg-status-error-bg/10 border-status-error-border text-status-error-fg">
      <AlertCircle className="h-10 w-10 mb-3 opacity-80" />
      <p className="text-sm font-medium">Não foi possível carregar o painel.</p>
    </div>
  )

  // Animation Variants
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
             className="h-full min-h-112.5 shadow-sm border-border/60"
          />
        </motion.div>

        {/* 3. MINHA FILA DE AÇÃO */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full flex flex-col shadow-sm border-border/60 bg-card overflow-hidden">
            <CardHeader className="pb-3 px-5 py-4 shrink-0 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
                  {/* Ícone Semântico (AI/Violet para Fila Inteligente) */}
                  <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-status-ai-bg border border-status-ai-border text-status-ai-fg">
                    <Clock className="h-4 w-4" /> 
                  </div>
                  Minha Fila
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
                  {waitingList?.length || 0}
                </Badge>
              </div>
              <CardDescription className="line-clamp-1 text-xs mt-1">
                Usuários aguardando sua primeira escuta.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden min-h-75">
              {waitingList && waitingList.length > 0 ? (
                <ul className="divide-y divide-border/40">
                  {waitingList.slice(0, 5).map((c: CaseItem) => (
                    <li key={c.id}>
                      <Link to={ROUTES.CASE_DETAIL(c.id)} className="block group">
                        <div className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {c.nomeCompleto}
                              </p>
                              {c.urgencia && (
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border",
                                  // Mapeamento de Urgência para Tokens Semânticos
                                  c.urgencia === 'GRAVISSIMA' ? "bg-status-error-bg text-status-error-fg border-status-error-border" :
                                  c.urgencia === 'MUITO_GRAVE' ? "bg-status-warning-bg text-status-warning-fg border-status-warning-border" :
                                  "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border"
                                )}>
                                  {c.urgencia.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 opacity-70" />
                                <span>
                                  há {formatDistanceToNow(new Date(c.dataEntrada), { locale: ptBR })}
                                </span>
                            </div>
                          </div>
                          
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0">
                            <ArrowRight className="h-4 w-4" />
                            <span className="sr-only">Ver caso</span>
                          </Button>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-62.5 text-muted-foreground gap-3">
                   <div className="p-4 bg-status-neutral-bg border border-status-neutral-border rounded-full">
                     <UserCheck className="h-8 w-8 text-status-neutral-fg opacity-60"/>
                   </div>
                   <p className="text-sm font-medium">Sua fila está vazia</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-4 border-t bg-muted/5">
              <Link to={ROUTES.WAITING_LIST} className="w-full">
                <Button className="w-full gap-2 shadow-sm border border-primary/20" variant="default">
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