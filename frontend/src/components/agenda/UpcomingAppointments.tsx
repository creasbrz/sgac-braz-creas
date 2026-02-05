// frontend/src/components/agenda/UpcomingAppointments.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  Clock, 
  MapPin, 
  Briefcase,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ROUTE_PATHS } from '@/constants/app-routes'

// Tipagem local
export interface UpcomingAppointment {
  id: string
  titulo: string
  data: string // ISO Date
  caso?: {
    id: string
    nomeCompleto: string
  }
  // [CORREÇÃO TS] Tipo estrito para evitar conflitos
  tipo?: 'AUDIENCIA' | 'VISITA' | 'ATENDIMENTO'
}

export interface UpcomingAppointmentsProps {
  data?: UpcomingAppointment[]
  title?: string
  className?: string
  enableScroll?: boolean
}

// --- SUB-COMPONENTS ---

function AppointmentSkeleton() {
  return (
    <div className="space-y-4 px-1 py-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2 border border-transparent">
          <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DateBadge({ date }: { date: string }) {
  const dateObj = isValid(new Date(date)) ? new Date(date) : new Date()
  
  return (
    <div 
      className="flex flex-col shrink-0 w-12 h-12 rounded-lg border border-border bg-card overflow-hidden shadow-sm group-hover:border-primary/30 group-hover:shadow-md transition-all duration-300"
      aria-label={`Dia ${format(dateObj, 'dd de MMMM')}`}
    >
      {/* Mês (Topo) */}
      <div className="h-4 bg-muted/40 flex items-center justify-center border-b border-border/40">
        <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/80">
          {format(dateObj, 'MMM', { locale: ptBR }).replace('.', '')}
        </span>
      </div>
      {/* Dia (Corpo) */}
      <div className="flex-1 flex items-center justify-center bg-background group-hover:bg-primary/5 transition-colors">
        <span className="text-lg font-bold text-foreground font-mono tracking-tighter leading-none">
          {format(dateObj, 'dd')}
        </span>
      </div>
    </div>
  )
}

function AppointmentItem({ app }: { app: UpcomingAppointment }) {
  const dateObj = isValid(new Date(app.data)) ? new Date(app.data) : new Date()
  const hasLink = !!app.caso?.id

  const Content = (
    <div className="flex items-start gap-3.5 p-3 rounded-xl transition-all duration-200 group hover:bg-muted/30 hover:pl-4 relative border border-transparent hover:border-border/40">
      <DateBadge date={app.data} />

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <p className="text-sm font-semibold text-foreground truncate leading-none group-hover:text-primary transition-colors">
          {app.titulo}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Hora */}
          <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/50">
             <Clock className="h-3 w-3" />
             <span className="font-mono font-medium">{format(dateObj, 'HH:mm')}</span>
          </div>

          {/* Local / Contexto */}
          {hasLink ? (
            <div className="flex items-center gap-1 truncate text-muted-foreground group-hover:text-foreground/80 transition-colors">
              <span className="text-border">|</span>
              <MapPin className="h-3 w-3 shrink-0" />
              {/* [CORREÇÃO TAILWIND] max-w-[140px] -> max-w-35 */}
              <span className="truncate max-w-35">{app.caso!.nomeCompleto}</span>
            </div>
          ) : (
             <div className="flex items-center gap-1 truncate opacity-70">
              <span className="text-border">|</span>
              <Briefcase className="h-3 w-3 shrink-0" />
              <span>Interno</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Hover Action Indicator */}
      {hasLink && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      )}
    </div>
  )

  if (hasLink) {
    return (
      <li>
        <Link to={`${ROUTE_PATHS.CASES}/${app.caso!.id}`} className="block focus:outline-none focus-visible:ring-2 ring-primary/20 rounded-xl">
          {Content}
        </Link>
      </li>
    )
  }

  return <li>{Content}</li>
}

// --- MAIN WIDGET ---

export function UpcomingAppointments({ 
  data: externalData, 
  title = "Agenda Próxima",
  className,
  enableScroll = false
}: UpcomingAppointmentsProps) {
  
  const { data: fetchedData, isLoading, isError } = useQuery<UpcomingAppointment[]>({
    queryKey: ['myAgendaStats'],
    queryFn: async () => {
      const { data } = await api.get('/stats/my-agenda')
      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    enabled: !externalData
  })

  const appointments = externalData || fetchedData
  const loading = !externalData && isLoading
  const hasAppointments = appointments && appointments.length > 0

  const ContentList = () => (
    <ul className="space-y-1 px-3 pb-3">
      {appointments?.map((app) => (
        <AppointmentItem key={app.id} app={app} />
      ))}
    </ul>
  )

  return (
    <Card className={cn("flex flex-col border shadow-sm overflow-hidden bg-card", className)}>
      <CardHeader className="pb-3 px-5 py-4 shrink-0 border-b border-border/40">
        <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              {/* Ícone usando o Token Semântico INFO (Azul) */}
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-status-info-bg border border-status-info-border text-status-info-fg">
                 <CalendarIcon className="h-4 w-4" /> 
              </div>
              <span className="text-foreground">{title}</span>
            </CardTitle>
            
            {hasAppointments && !loading && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="h-7 text-[10px] uppercase font-bold text-muted-foreground px-2.5 hover:bg-muted/50 hover:text-primary transition-colors"
              >
                <Link to={ROUTE_PATHS.AGENDA}>
                  Ver tudo <ArrowRight className="h-3 w-3 ml-1.5 opacity-70"/>
                </Link>
              </Button>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 min-h-40 relative">
        {loading ? (
           <div className="p-4"><AppointmentSkeleton /></div>
        ) : isError && !externalData ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-status-error-fg p-6 opacity-80">
            <div className="p-3 bg-status-error-bg rounded-full border border-status-error-border">
               <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium">Erro ao sincronizar agenda.</p>
          </div>
        ) : !hasAppointments ? (
          // --- Empty State Positivo (SUCCESS) ---
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Usa Tokens Semânticos de Sucesso */}
            <div className="bg-status-success-bg border border-status-success-border p-4 rounded-full mb-3 shadow-sm">
               <CalendarCheck className="h-8 w-8 text-status-success-fg" />
            </div>
            <p className="text-sm font-semibold text-foreground">Tudo em dia!</p>
            {/* [CORREÇÃO TAILWIND] max-w-[200px] -> max-w-50 */}
            <p className="text-xs mt-1.5 text-muted-foreground leading-relaxed max-w-50">
              Nenhum compromisso agendado para os próximos dias. Aproveite para adiantar outras tarefas.
            </p>
          </div>
        ) : (
          // --- Lista de Conteúdo ---
          enableScroll ? (
            // Se enableScroll for true, usa posicionamento absoluto para preencher o card pai (Bento Grid Style)
            <div className="absolute inset-0">
                <ScrollArea className="h-full w-full">
                    <div className="py-3">
                        <ContentList />
                    </div>
                </ScrollArea>
            </div>
          ) : (
            <div className="py-3">
               <ContentList />
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}