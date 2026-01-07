import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { DatesSetArg } from '@fullcalendar/core'
import { useRef } from 'react'
import './calendar-custom.css'

// [TIPAGEM] Definindo as props extendidas para evitar 'any'
interface CalendarExtendedProps {
  nomeCompleto?: string
  telefone?: string
  urgencia?: string
  [key: string]: any // Flexibilidade para outros campos futuros
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

  // Função que desenha o conteúdo de cada evento (Card Compacto)
  const renderEventContent = (eventInfo: any) => {
    const { title, extendedProps, backgroundColor } = eventInfo.event
    
    // Fallback de cor caso venha vazio
    const safeColor = backgroundColor || 'hsl(var(--primary))'

    return (
      <div 
        className="flex w-full overflow-hidden rounded-sm bg-card border shadow-sm text-xs leading-tight transition-colors hover:border-primary/40 hover:bg-accent/10 cursor-pointer"
        title={`${title} - ${extendedProps.nomeCompleto || 'Sem nome'}`} // [UX] Tooltip nativo
      >
        {/* Faixa colorida lateral */}
        <div 
          className="w-1 shrink-0" 
          style={{ backgroundColor: safeColor }} 
        />
        
        {/* Conteúdo de Texto */}
        <div className="p-1 flex-1 overflow-hidden text-foreground">
          {/* Hora (se não for dia inteiro) */}
          {eventInfo.timeText && (
            <div className="font-mono text-[10px] text-muted-foreground mb-0.5">
              {eventInfo.timeText}
            </div>
          )}
          
          {/* Título do Agendamento (Ex: Visita) */}
          <div className="font-bold truncate">
            {title}
          </div>
          
          {/* Nome do Usuário/Caso */}
          <div className="truncate text-[10px] text-muted-foreground mt-0.5">
            {extendedProps.nomeCompleto || 'Sem nome'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-card rounded-xl shadow-sm border border-border overflow-hidden p-2">
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
          list: 'Lista'
        }}
        events={events}
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => onEventClick(info)}
        datesSet={datesSet} // Hook essencial para lazy loading ou filtros
        eventContent={renderEventContent}
        height="100%"
        dayMaxEvents={3} // Limite de eventos visíveis
        dayMaxEventRows={3} // Garante consistência vertical
        editable={false}
        selectable={true}
        selectMirror={true}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        nowIndicator={true} // Linha vermelha no horário atual
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
      />
    </div>
  )
}