// frontend/src/components/dashboard/UpcomingPafDeadlines.tsx

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api' //
import { AlertTriangle, CalendarCheck, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card' //
import { Badge } from '@/components/ui/badge'
import { ROUTES } from '@/constants/routes' //
import { formatDateSafe } from '@/utils/formatters' //

interface PafDeadlineAlert {
  pafId: string
  deadline: string
  caseId: string
  caseName: string
  specialistName: string
  objetivosResumo: string
}

export function UpcomingPafDeadlines() {
  const {
    data: alerts,
    isLoading,
    isError,
  } = useQuery<PafDeadlineAlert[]>({
    queryKey: ['pafDeadlineAlerts'],
    queryFn: async () => {
      const response = await api.get('/alerts/paf-deadlines')
      return response.data
    },
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 flex-shrink-0" /> {/* Impede ícone de esmagar */}
            Prazos de PAF Próximos (7 dias)
          </CardTitle>
          <CardDescription>
            <span className="sr-only">Carregando prazos...</span>
            A carregar prazos...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            Erro ao Carregar Prazos
          </CardTitle>
          <CardDescription>
            Não foi possível buscar os prazos de PAF.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sortedAlerts = [...(alerts ?? [])].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )

  return (
    <Card className="h-full"> {/* Garante altura consistente se estiver em grid */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 flex-shrink-0 text-primary" />
          Prazos de PAF Próximos
        </CardTitle>
        <CardDescription>
          {sortedAlerts.length > 0
            ? `${sortedAlerts.length} PAF(s) vencendo nos próximos 7 dias.`
            : 'Nenhum PAF com prazo crítico para esta semana.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {sortedAlerts.length > 0 ? (
          <ul className="space-y-3">
            {sortedAlerts.map((alert) => {
              const deadlineDate = new Date(alert.deadline)

              return (
                <li
                  key={`${alert.caseId}-${alert.pafId}`}
                  // CORREÇÃO DE LAYOUT:
                  // 'items-start' alinha ao topo (melhor para textos longos)
                  // 'overflow-hidden' impede vazamento
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 border rounded-md bg-background/50 hover:bg-accent/50 transition-colors"
                >
                  {/* Lado Esquerdo: Informações do Caso (com truncate) */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <Link
                      to={ROUTES.CASE_DETAIL(alert.caseId)} //
                      className="font-semibold text-primary hover:underline block truncate"
                      title={`Ver caso: ${alert.caseName}`}
                    >
                      Caso: {alert.caseName}
                    </Link>

                    <p
                      className="text-sm text-muted-foreground line-clamp-2" // line-clamp-2 limita a 2 linhas
                      title={alert.objetivosResumo}
                    >
                      <span className="font-medium text-foreground/80">Objetivo:</span> {alert.objetivosResumo}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      Responsável: {alert.specialistName}
                    </p>
                  </div>

                  {/* Lado Direito: Data (fixo, não encolhe) */}
                  <div className="text-right flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                    <Badge variant="outline" className="whitespace-nowrap border-destructive/30 text-destructive bg-destructive/5">
                      {formatDateSafe(alert.deadline)}
                    </Badge>

                    <p className="text-xs font-medium text-destructive mt-0.5">
                      Vence {formatDistanceToNow(deadlineDate, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CalendarCheck className="h-10 w-10 mb-2 opacity-20" />
            <p>Tudo em dia por aqui.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}