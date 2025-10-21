// frontend/src/components/UpcomingAppointments.tsx
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
import { formatDateSafe } from '@/utils/formatters'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UpcomingAppointment } from '@/types/agenda'

function AppointmentSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UpcomingAppointments() {
  const { data: appointments, isLoading, isError } = useQuery<UpcomingAppointment[]>({
    queryKey: ['myAgendaStats'],
    queryFn: async () => {
      const response = await api.get('/stats/my-agenda')
      return response.data
    },
    // Recarrega os dados a cada 5 minutos
    staleTime: 1000 * 60 * 5, 
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos Agendamentos</CardTitle>
        <CardDescription>
          Os seus próximos 5 compromissos agendados no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <AppointmentSkeleton />}
        {isError && (
          <p className="text-destructive">
            Não foi possível carregar os seus agendamentos.
          </p>
        )}
        {!isLoading && !isError && appointments?.length === 0 && (
          <p className="text-muted-foreground">
            Você não tem nenhum agendamento futuro.
          </p>
        )}
        {!isLoading && !isError && appointments && appointments.length > 0 && (
          <ul className="space-y-4">
            {appointments.map((app) => (
              <li key={app.id} className="flex items-center gap-4">
                <div className="flex-none text-center border rounded-md px-3 py-1">
                  <span className="block text-xs uppercase text-primary font-semibold">
                    {format(new Date(app.data), 'MMM', { locale: ptBR })}
                  </span>
                  <span className="block text-lg font-bold">
                    {format(new Date(app.data), 'dd')}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{app.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    <Link
                      to={ROUTES.CASE_DETAIL.replace(':id', app.caso.id)}
                      className="hover:underline"
                    >
                      Caso: {app.caso.nomeCompleto}
                    </Link>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateSafe(app.data)} às {format(new Date(app.data), 'HH:mm')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}