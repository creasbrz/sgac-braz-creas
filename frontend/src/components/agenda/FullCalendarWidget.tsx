// frontend/src/components/agenda/FullCalendarWidget.tsx
import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { DatesSetArg, EventContentArg } from '@fullcalendar/core'

// UI & Icons
import { cn } from '@/lib/utils'
import { Clock, User, AlertCircle } from 'lucide-react'
import './calendar-custom.css'

// Interfaces
interface CalendarExtendedProps {
  nomeCompleto?: string
  telefone?: string
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA'
  // [CORREÇÃO TS] Index signature para flexibilidade com props extras do backend
  [key: string]: any
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor?: string
  borderColor?: string
  extendedProps?: CalendarExtendedProps
}

interface FullCalendarWidgetProps {
  events: CalendarEvent[]
  onDateClick: (date: Date) => void
  onEventClick: (info: any) => void
  datesSet?: (arg: DatesSetArg) => void
}

export function FullCalendarWidget({ 
  events, 
  onDateClick, 
  onEventClick, 
  datesSet 
}: FullCalendarWidgetProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO CUSTOMIZADA DE EVENTOS (CARD DESIGN)
  // --------------------------------------------------------------------------
  const renderEventContent = (eventInfo: EventContentArg) => {
    const { title, extendedProps, backgroundColor } = eventInfo.event
    const viewType = eventInfo.view.type
    
    // Identifica o tipo de visualização
    const isList = viewType.includes('list')
    const isWeek = viewType.includes('timeGrid') // Semana ou Dia
    const isUrgent = extendedProps.urgencia === 'ALTA'

    // Cor base (se não definida, usa a primária do tema)
    const eventColor = backgroundColor || 'hsl(var(--primary))'

    // --- MODO LISTA (AGENDA) ---
    if (isList) {
      return (
        <div className="flex flex-col py-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{title}</span>
            {isUrgent && (
              <span className="inline-flex items-center rounded-full border border-status-error-border bg-status-error-bg px-1.5 py-0.5 text-[10px] font-medium text-status-error-fg">
                Urgente
              </span>
            )}
          </div>
          {extendedProps.nomeCompleto && (
            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">{extendedProps.nomeCompleto}</span>
            </div>
          )}
        </div>
      )
    }

    // --- MODO GRID (SEMANA E MÊS) ---
    return (
      <div 
        className={cn(
          "group flex w-full flex-col justify-start rounded-md border bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
          // [CORREÇÃO CRÍTICA PARA SEMANA]
          // overflow-hidden: Garante que o texto não vaze do tempo alocado
          // h-full: Ocupa exatamente o tempo definido pelo FullCalendar (na semana)
          isWeek ? "h-full overflow-hidden" : "relative h-auto min-h-6 mb-0.5 overflow-hidden",
          
          isUrgent ? "border-status-error-border bg-status-error-bg/10" : "border-border"
        )}
        style={{ 
          // Borda esquerda colorida (Identidade Visual do Evento)
          borderLeftWidth: '4px',
          borderLeftColor: isUrgent ? 'hsl(var(--status-error-fg))' : eventColor 
        }}
      >
        <div className={cn("flex flex-col gap-0.5", isWeek ? "p-1" : "p-1.5")}>
          {/* Cabeçalho: Hora + Ícone de Urgência */}
          <div className="flex items-center justify-between gap-1 text-[10px] leading-none text-muted-foreground/80">
            {/* Na semana, o FullCalendar já mostra a hora fora do evento se for curto, 
                mas mostramos aqui para garantir contexto em eventos longos */}
            {!isWeek && eventInfo.timeText && (
              <div className="flex items-center gap-1 font-mono tracking-tight">
                <Clock className="h-2.5 w-2.5" />
                <span>{eventInfo.timeText}</span>
              </div>
            )}
            
            {/* Na semana, priorizamos o espaço, mostramos hora só se tiver espaço ou no tooltip nativo */}
            {isWeek && (
               <span className="text-[9px] font-mono opacity-70">{eventInfo.timeText}</span>
            )}

            {isUrgent && <AlertCircle className="h-3 w-3 text-status-error-fg animate-pulse" />}
          </div>

          {/* Título Principal */}
          <div className={cn(
            "font-semibold text-foreground leading-tight",
            // [CORREÇÃO] line-clamp-2 corta o texto se ele for maior que o evento na semana
            isWeek ? "text-[10px] line-clamp-2 wrap-break-word" : "text-[11px] truncate"
          )}>
            {title}
          </div>

          {/* Nome do Assistido */}
          {extendedProps.nomeCompleto && (
            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground/90">
              {/* Ícone oculto em views muito pequenas para economizar espaço */}
              <User className={cn("shrink-0", isWeek ? "h-2 w-2" : "h-2.5 w-2.5")} />
              <span className={cn(
                "font-medium",
                isWeek ? "text-[9px] line-clamp-1" : "text-[10px] truncate"
              )}>
                {extendedProps.nomeCompleto.split(' ')[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    // Container com altura responsiva e borda integrada ao tema (Tailwind 4 classes)
    <div className="w-full bg-background rounded-xl border shadow-sm overflow-hidden h-[70dvh] lg:h-[calc(100vh-120px)]">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        
        // Header Toolbar Minimalista
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listMonth'
        }}
        
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          list: 'Agenda'
        }}

        // Dados e Eventos
        events={events}
        eventContent={renderEventContent}
        
        // Configurações de Layout e Duração
        forceEventDuration={true}
        defaultTimedEventDuration="01:00:00"
        
        // Interatividade
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        eventDisplay="block"
        expandRows={true}
        
        // Handlers
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => onEventClick(info)}
        datesSet={datesSet}
        moreLinkContent={(args) => `+${args.num}`}

        // Configurações de Horário (CREAS Geralmente 07h-19h)
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          omitZeroMinute: false,
          meridiem: false
        }}
        
        // Formato de Hora (24h)
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
        
        // Classes Utilitárias
        height="100%"
        dayCellClassNames="hover:bg-accent/5 transition-colors cursor-pointer"
        viewClassNames="bg-background"
      />
    </div>
  )
}