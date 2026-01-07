import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarX, AlertTriangle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import type { UpcomingAppointment } from '@/types/agenda'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils' // Importante para classes condicionais

interface UpcomingAppointmentsProps {
  data?: any[]
  title?: string
  description?: string
  enableScroll?: boolean
}

function AppointmentSkeleton() {
  return (
    <div className="space-y-3 px-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UpcomingAppointments({ 
  data: externalData, 
  title = "Próximos Agendamentos",
  description = "Seus próximos compromissos prioritários.",
  enableScroll = false
}: UpcomingAppointmentsProps) {
  
  const { data: fetchedData, isLoading, isError } = useQuery<UpcomingAppointment[]>({
    queryKey: ['myAgendaStats'],
    queryFn: async () => {
      const response = await api.get('/stats/my-agenda')
      return response.data
    },
    staleTime: 1000 * 60 * 5, 
    enabled: !externalData
  })

  const appointments = externalData || fetchedData
  const loading = !externalData && isLoading
  
  // [CORREÇÃO 1]: ScrollArea agora usa max-h (encolhe se tiver pouco, rola se tiver muito)
  const ContentWrapper = enableScroll ? ScrollArea : 'div'
  
  // [CORREÇÃO 2]: Altura máxima de 260px (~3.5 itens) para não esticar a sidebar
  const wrapperProps = enableScroll ? { className: "max-h-[260px] pr-3" } : {}

  return (
    <Card 
      className={cn(
        "shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col",
        // [CORREÇÃO 3]: Se tiver scroll (Workspace), usa w-full e altura automática.
        // Se for Dashboard, usa h-full para alinhar com grid.
        enableScroll ? "w-full h-auto" : "h-full"
      )}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
           <CardTitle className="text-base font-semibold flex items-center gap-2">
             <CalendarIcon className="h-4 w-4 text-primary"/> {title}
           </CardTitle>
           
           {!loading && !isError && appointments && appointments.length > 0 && (
             <Link to={ROUTES.AGENDA} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase font-bold tracking-wider">
               Ver todos <ArrowRight className="h-3 w-3"/>
             </Link>
           )}
        </div>
        {/* Descrição condicional para economizar espaço na sidebar */}
        {description && !enableScroll && (
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-4 pt-2">
        {loading && <AppointmentSkeleton />}
        
        {isError && !externalData && (
          <div className="flex flex-col items-center justify-center py-6 text-center bg-destructive/5 rounded-lg border border-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive mb-2 opacity-80" />
            <p className="text-xs font-medium text-destructive">Erro ao carregar.</p>
          </div>
        )}

        {!loading && (!appointments || appointments.length === 0) && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/5">
            <CalendarX className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs font-medium">Agenda livre</p>
          </div>
        )}

        {!loading && appointments && appointments.length > 0 && (
          // @ts-ignore
          <ContentWrapper {...wrapperProps}>
            <ul className="space-y-2">
              {appointments.map((app: any) => (
                <li 
                  key={app.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-default border border-transparent hover:border-border/50"
                >
                  {/* Bloco de Data Compacto */}
                  <div className="flex-none flex flex-col items-center justify-center w-10 h-10 border rounded-md bg-background shadow-sm group-hover:border-primary/30 transition-colors">
                    <span className="text-[9px] uppercase tracking-wider text-primary font-bold leading-none mb-0.5">
                      {format(new Date(app.data), 'MMM', { locale: ptBR }).replace('.', '')}
                    </span>
                    <span className="text-sm font-bold text-foreground leading-none">
                      {format(new Date(app.data), 'dd')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-xs md:text-sm line-clamp-1 group-hover:text-primary transition-colors" title={app.titulo}>
                      {app.titulo}
                    </p>
                    
                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/80 tabular-nums">
                        {format(new Date(app.data), 'HH:mm')}
                      </span>
                      <span className="opacity-50">|</span>
                      <Link
                        to={ROUTES.CASE_DETAIL(app.caso?.id || '')}
                        className="hover:underline hover:text-primary transition-colors truncate max-w-[120px]"
                        title={app.caso?.nomeCompleto}
                      >
                        {app.caso?.nomeCompleto || 'Interno'}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ContentWrapper>
        )}
      </CardContent>
    </Card>
  )
}