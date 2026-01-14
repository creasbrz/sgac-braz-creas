// frontend/src/components/agenda/UpcomingAppointments.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  CalendarX, AlertTriangle, Calendar as CalendarIcon, 
  ArrowRight, Clock, MapPin, CalendarDays 
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ROUTE_PATHS } from '@/constants/app-routes'
import type { UpcomingAppointment } from '@/types/agenda'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
export interface UpcomingAppointmentsProps {
  data?: UpcomingAppointment[]
  title?: string
  description?: string
  className?: string
  enableScroll?: boolean
}

// --- SUB-COMPONENTS ---

function AppointmentSkeleton() {
  return (
    <div className="space-y-3 px-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DateBadge({ date }: { date: string }) {
  const dateObj = isValid(new Date(date)) ? new Date(date) : new Date()
  return (
    <div className="flex-none flex flex-col items-center justify-center w-11 h-11 border rounded-lg bg-card shadow-sm overflow-hidden group-hover:border-primary/40 transition-colors shrink-0">
      <div className="w-full h-3.5 bg-primary/5 border-b flex items-center justify-center">
         <span className="text-[9px] uppercase tracking-widest text-primary font-bold leading-none mt-0.5">
            {format(dateObj, 'MMM', { locale: ptBR }).replace('.', '')}
         </span>
      </div>
      <div className="flex-1 flex items-center justify-center bg-background w-full">
         <span className="text-lg font-bold text-foreground leading-none -mt-0.5 font-mono tracking-tight">
            {format(dateObj, 'dd')}
         </span>
      </div>
    </div>
  )
}

function AppointmentItem({ app }: { app: UpcomingAppointment }) {
  const dateObj = isValid(new Date(app.data)) ? new Date(app.data) : new Date()
  
  return (
    <li className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all border border-transparent hover:border-border/60 cursor-default">
      <DateBadge date={app.data} />

      <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors leading-tight" title={app.titulo}>
          {app.titulo}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground/90">
          <div className="flex items-center gap-1 min-w-fit">
             <Clock className="h-3 w-3 opacity-70" />
             <span className="font-medium tabular-nums text-foreground/80">
                {format(dateObj, 'HH:mm')}
             </span>
          </div>
          <span className="text-border/60">|</span>
          {app.caso?.id ? (
            <Link
              to={`${ROUTE_PATHS.CASES}/${app.caso.id}`}
              className="hover:underline hover:text-primary transition-colors truncate flex items-center gap-1"
              title={app.caso.nomeCompleto}
            >
              <MapPin className="h-3 w-3 opacity-70" />
              {app.caso.nomeCompleto}
            </Link>
          ) : (
            <span className="truncate flex items-center gap-1 opacity-80">
               <CalendarDays className="h-3 w-3 opacity-70" />
               Interno
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

// --- MAIN COMPONENT ---

export function UpcomingAppointments({ 
  data: externalData, 
  title = "Próximos Agendamentos",
  className,
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
  const hasAppointments = appointments && appointments.length > 0

  const ContentList = () => (
    <ul className="space-y-1 p-4 pt-1">
      {appointments?.map((app) => (
        <AppointmentItem key={app.id} app={app} />
      ))}
    </ul>
  )

  return (
    <Card className={cn("flex flex-col h-full border shadow-sm overflow-hidden", className)}>
      <CardHeader className="pb-3 pt-4 px-5 space-y-1 shrink-0 bg-muted/20 border-b">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <CalendarIcon className="h-4 w-4 text-primary"/> {title}
            </CardTitle>
            
            {hasAppointments && !loading && (
              <Link to={ROUTE_PATHS.AGENDA} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider bg-background px-2 py-1 rounded-full border shadow-sm">
                Ver todos <ArrowRight className="h-3 w-3"/>
              </Link>
            )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 min-h-[150px] relative bg-card">
        {/* Loading State */}
        {loading ? (
           <div className="p-4"><AppointmentSkeleton /></div>
        ) : isError && !externalData ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-destructive/80 px-4 opacity-80">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">Erro ao carregar agenda.</p>
          </div>
        ) : !hasAppointments ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center text-muted-foreground/60 px-4">
            <div className="bg-muted/30 p-3 rounded-full mb-3">
               <CalendarX className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Agenda Livre</p>
            <p className="text-xs max-w-[180px] mt-1 opacity-80">Nenhum compromisso agendado.</p>
          </div>
        ) : (
          // Content
          enableScroll ? (
            <div className="absolute inset-0">
               <ScrollArea className="h-full">
                 <ContentList />
               </ScrollArea>
            </div>
          ) : (
            <div><ContentList /></div>
          )
        )}
      </CardContent>
    </Card>
  )
}