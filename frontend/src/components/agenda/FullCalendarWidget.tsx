// frontend/src/components/agenda/FullCalendarWidget.tsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { DatesSetArg } from '@fullcalendar/core'
import { useRef } from 'react'
import { cn } from '@/lib/utils' // Utility padrão shadcn
import './calendar-custom.css'

interface CalendarExtendedProps {
  nomeCompleto?: string
  telefone?: string
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA'
  [key: string]: any
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
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

export function FullCalendarWidget({ events, onDateClick, onEventClick, datesSet }: FullCalendarWidgetProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Renderização customizada inteligente
  const renderEventContent = (eventInfo: any) => {
    const { title, extendedProps, backgroundColor } = eventInfo.event
    const viewType = eventInfo.view.type // 'dayGridMonth', 'timeGridWeek', 'listMonth'
    
    const isList = viewType === 'listMonth'
    const isWeek = viewType === 'timeGridWeek'
    
    // Cor segura
    const safeColor = backgroundColor || 'hsl(var(--primary))'
    
    // Se for Lista, deixamos o FullCalendar gerenciar o layout padrão que é bom
    if (isList) {
      return (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{extendedProps.nomeCompleto}</span>
        </div>
      )
    }

    // Para Grid (Mês/Semana)
    return (
      <div 
        className={cn(
          "flex w-full overflow-hidden rounded-[3px] bg-card border shadow-sm text-xs leading-tight transition-all hover:brightness-95 cursor-pointer h-full",
          extendedProps.urgencia === 'ALTA' && "border-red-500 border-l-[4px]" // Destaque para urgência
        )}
        style={{ borderLeftColor: extendedProps.urgencia !== 'ALTA' ? safeColor : undefined }}
        title={`${title} - ${extendedProps.nomeCompleto || 'Sem nome'}`}
      >
        {/* Indicador lateral de cor (se não for urgente) */}
        {extendedProps.urgencia !== 'ALTA' && (
           <div className="w-1 shrink-0" style={{ backgroundColor: safeColor }} />
        )}
        
        <div className="p-1.5 flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
             {/* Hora só aparece se não for semana (pois semana já tem eixo Y de hora) */}
             {!isWeek && eventInfo.timeText && (
               <span className="font-mono text-[10px] opacity-70 shrink-0">{eventInfo.timeText}</span>
             )}
             <span className="font-semibold truncate text-foreground">{title}</span>
          </div>
          
          {/* Detalhes extras apenas se houver espaço (Semana ou Mês com poucos eventos) */}
          <span className="truncate text-[10px] text-muted-foreground/80 mt-0.5 font-medium">
            {extendedProps.nomeCompleto || 'Sem nome'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] w-full bg-background rounded-xl shadow-sm border border-border overflow-hidden p-2 md:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
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
        events={events}
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => onEventClick(info)}
        datesSet={datesSet}
        eventContent={renderEventContent}
        height="100%"
        dayMaxEvents={3}
        moreLinkContent={(args) => `+${args.num} mais`} // Tradução do link "more"
        editable={false}
        selectable={true}
        selectMirror={true}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          omitZeroMinute: false,
          meridiem: false
        }}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
        // Estilização global das células
        dayCellClassNames="hover:bg-accent/5 transition-colors cursor-pointer"
        viewClassNames="bg-background"
      />
    </div>
  )
}