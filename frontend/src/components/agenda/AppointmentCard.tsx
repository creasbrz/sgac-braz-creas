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

// Lazy load para performance
const WhatsAppButton = lazy(() => import("@/components/common/WhatsAppButton").then(module => ({ default: module.WhatsAppButton })))

interface AppointmentCardProps {
  appointment: Appointment
}

// Memoizado para evitar re-render desnecessário
export const AppointmentCard = memo(function AppointmentCard({ appointment: app }: AppointmentCardProps) {
  const dateObj = safeParseISO(app.data)

  if (!dateObj) return null

  return (
    <div className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-primary/30 transition-all shadow-sm">
      {/* Coluna Hora */}
      <div className="flex sm:flex-col items-center sm:items-center justify-center sm:justify-start gap-2 sm:gap-0 min-w-[70px] border-b sm:border-b-0 sm:border-r pb-2 sm:pb-0 sm:pr-4">
        <span className="text-xl font-bold text-primary">
          {format(dateObj, 'HH:mm')}
        </span>
        <span className="text-xs text-muted-foreground uppercase">
          {format(dateObj, 'EEE', { locale: ptBR })}
        </span>
      </div>

      {/* Coluna Detalhes */}
      <div className="flex-1 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-lg leading-none">{app.titulo}</h4>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
              <Link 
                to={ROUTES.CASE_DETAIL(app.caso.id)} 
                className="flex items-center gap-1.5 hover:text-primary hover:underline transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                {app.caso.nomeCompleto}
              </Link>
            </div>
          </div>

          {/* Botão de Ação (Confirmar Presença) */}
          {app.caso.telefone && isValidBrazilianPhone(app.caso.telefone) && (
            <div className="shrink-0">
               <Suspense fallback={<div className="w-24 h-8 bg-muted rounded animate-pulse" />}>
                  <WhatsAppButton 
                    phone={app.caso.telefone}
                    name={app.caso.nomeCompleto}
                    template="agendamento"
                    data={{ date: app.data }} // Passa a data para o template
                    label="Confirmar Presença"
                    variant="outline"
                    size="sm"
                  />
               </Suspense>
            </div>
          )}
        </div>

        {app.observacoes && (
          <div className="bg-muted/50 p-2 rounded-md text-sm text-muted-foreground mt-2 border border-transparent group-hover:border-border/50 transition-colors">
            <p className="line-clamp-2">{app.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  )
})