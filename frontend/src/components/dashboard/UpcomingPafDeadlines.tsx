// frontend/src/components/dashboard/UpcomingPafDeadlines.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AlertTriangle, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AlertItem {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'info'
}

export function UpcomingPafDeadlines() {
  const { data: alerts, isLoading, isError } = useQuery<AlertItem[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const res = await api.get('/alerts')
        if (!Array.isArray(res.data)) return []
        
        // Filtra apenas notificações relevantes
        return res.data.filter((item: AlertItem) => 
          item.title.includes('PAF') || 
          item.id.startsWith('paf-') ||
          item.type === 'critical'
        )
      } catch {
        return []
      }
    },
    refetchInterval: 1000 * 60 
  })

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Alertas e Prazos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="h-full border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center justify-center h-full py-6 text-destructive text-sm">
          Erro ao carregar alertas.
        </CardContent>
      </Card>
    )
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : []

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Atenção Necessária</span>
          </div>
          {safeAlerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {safeAlerts.length} pendentes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto pr-2">
        {safeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/10">
            <CheckCircle2 className="h-8 w-8 text-green-500/50 mb-2" />
            <p>Tudo em dia!</p>
            <p className="text-xs opacity-70">Nenhum prazo crítico pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* [CORREÇÃO - Pedido 3] Limitando a 6 notificações */}
            {safeAlerts.slice(0, 6).map((item) => (
              <div 
                key={item.id} 
                className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2" title={item.description}>
                      {item.description}
                    </p>
                  </div>
                  
                  {item.type === 'critical' && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
                      Urgente
                    </Badge>
                  )}
                </div>

                <Button asChild variant="ghost" size="sm" className="w-full justify-between h-7 text-xs mt-1 border border-input/50">
                  <Link to={item.link}>
                    Ver Detalhes
                    <ArrowRight className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </div>
            ))}
            {safeAlerts.length > 6 && (
               <p className="text-xs text-center text-muted-foreground mt-2">
                 + {safeAlerts.length - 6} outras notificações
               </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}