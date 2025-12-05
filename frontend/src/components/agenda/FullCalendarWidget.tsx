// frontend/src/components/agenda/FullCalendarWidget.tsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useRef } from 'react'
import './calendar-custom.css'

interface Event {
  id: string
  title: string
  start: string
  backgroundColor?: string
  borderColor?: string
  extendedProps?: any
}

interface FullCalendarWidgetProps {
  events: Event[]
  onDateClick: (date: Date) => void
  onEventClick: (info: any) => void
}

export function FullCalendarWidget({ events, onDateClick, onEventClick }: FullCalendarWidgetProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Função que desenha o conteúdo de cada evento
  const renderEventContent = (eventInfo: any) => {
    const { title, extendedProps, backgroundColor } = eventInfo.event
    
    return (
      <div className="flex w-full overflow-hidden rounded-sm bg-card border shadow-sm text-xs leading-tight">
        {/* Faixa colorida lateral */}
        <div 
          className="w-1 shrink-0" 
          style={{ backgroundColor: backgroundColor }} 
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
        eventContent={renderEventContent} // <--- AQUI ESTÁ A MÁGICA
        height="100%"
        dayMaxEvents={3} // Limita a 3 para não esticar demais a célula
        editable={false}
        selectable={true}
        selectMirror={true}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false
        }}
      />
    </div>
  )
}