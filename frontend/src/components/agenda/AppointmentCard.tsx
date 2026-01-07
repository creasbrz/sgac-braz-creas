// frontend/src/components/agenda/AppointmentCard.tsx
import { memo, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { safeParseISO } from '@/utils/date'
import type { Appointment } from '@/hooks/useAppointments'
import { isValidBrazilianPhone } from '@/utils/phone'

// Lazy load
const WhatsAppButton = lazy(() => import("@/components/common/WhatsAppButton").then(module => ({ default: module.WhatsAppButton })))

interface AppointmentCardProps {
  appointment: Appointment
}

// Memoizado
export const AppointmentCard = memo(function AppointmentCard({ appointment: app }: AppointmentCardProps) {
  const dateObj = safeParseISO(app.data)

  if (!dateObj) return null

  return (
    <div className="group flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/30 transition-[background-color,border-color,box-shadow] duration-200 shadow-sm">
      
      {/* Coluna Hora & Dia */}
      <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 min-w-[70px] border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 sm:pr-4">
        <span className="text-xl font-bold text-primary tabular-nums">
          {format(dateObj, 'HH:mm')}
        </span>
        <span className="text-[10px] md:text-[11px] tracking-wide text-muted-foreground uppercase font-medium">
          {format(dateObj, 'EEE', { locale: ptBR })}
        </span>
      </div>

      {/* Coluna Detalhes */}
      <div className="flex-1 space-y-2 min-w-0"> {/* min-w-0 evita overflow flex */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-lg leading-tight text-foreground truncate pr-2" title={app.titulo}>
              {app.titulo}
            </h4>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Link 
                to={ROUTES.CASE_DETAIL(app.caso.id)} 
                className="flex items-center gap-1.5 hover:text-primary hover:underline transition-colors truncate max-w-full"
                aria-label={`Ver prontuário de ${app.caso.nomeCompleto}`}
                title={app.caso.nomeCompleto}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{app.caso.nomeCompleto}</span>
              </Link>
            </div>
          </div>

          {/* Botão de Ação */}
          {app.caso.telefone && isValidBrazilianPhone(app.caso.telefone) && (
            <div className="self-start sm:self-auto shrink-0">
               <Suspense fallback={<div className="w-24 h-8 bg-muted/50 rounded animate-pulse" />}>
                  <WhatsAppButton 
                    phone={app.caso.telefone}
                    name={app.caso.nomeCompleto}
                    template="agendamento"
                    data={{ date: app.data }}
                    label="Confirmar"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs px-3 shadow-none border-dashed border-border hover:border-whatsapp hover:bg-whatsapp/5 hover:text-whatsapp transition-all"
                  />
               </Suspense>
            </div>
          )}
        </div>

        {app.observacoes && (
          <div className="bg-muted/40 dark:bg-muted/20 p-2.5 rounded-md text-sm text-muted-foreground mt-2 border border-transparent group-hover:border-border/40 transition-colors">
            <p className="line-clamp-2 leading-relaxed text-xs md:text-sm">
              {app.observacoes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
})