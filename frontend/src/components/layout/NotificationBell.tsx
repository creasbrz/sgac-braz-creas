import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface NotificationItem {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'info'
}

interface DeadlineAlert {
  pafId: string
  caseId: string
  caseName: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications-bell', user?.cargo],
    queryFn: async () => {
      const items: NotificationItem[] = []

      // ---------------------------
      // 1. ALERTAS DE PAF (exceto agentes)
      // ---------------------------
      if (user?.cargo !== 'Agente Social') {
        try {
          const pafRes = await api.get('/alerts/paf-deadlines')
          const pafs: DeadlineAlert[] = Array.isArray(pafRes.data) ? pafRes.data : []

          pafs.forEach((p) => {
            items.push({
              id: `paf-${p.pafId}`,
              title: 'Prazo de PAF Vencendo',
              description: `Caso: ${p.caseName}. Prazo se encerra em breve.`,
              link: ROUTES.CASE_DETAIL(p.caseId),
              type: 'critical',
            })
          })
        } catch {
          // Evita quebra caso a rota falhe
        }
      }

      // ---------------------------
      // 2. NOVOS CASOS PARA ACOLHIDA (Agente Social e Gerente)
      // ---------------------------
      if (user?.cargo === 'Agente Social' || user?.cargo === 'Gerente') {
        try {
          const res = await api.get('/cases', {
            params: { status: 'AGUARDANDO_ACOLHIDA', pageSize: 5 },
          })

          const total = Number(res.data?.total ?? 0)

          if (total > 0) {
            items.push({
              id: 'new-cases-queue',
              title: 'Casos Aguardando Acolhida',
              description: `Existem ${total} casos aguardando acolhida.`,
              link: ROUTES.CASES,
              type: 'info',
            })
          }
        } catch {
          // Evita erro caso a rota não esteja disponível
        }
      }

      return items
    },
    refetchInterval: 60_000, // 1 vez por minuto
    staleTime: 30_000,
  })

  const criticalCount = notifications.filter((n) => n.type === 'critical').length
  const hasNotifications = notifications.length > 0

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />

          {hasNotifications && (
            <span
              className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border border-background ${
                criticalCount > 0 ? 'bg-destructive' : 'bg-blue-500'
              }`}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notificações</h4>

          {hasNotifications && (
            <Badge variant="secondary">{notifications.length}</Badge>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação nova.
            </div>
          ) : (
            <div className="grid gap-1">
              {notifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        item.type === 'critical' ? 'bg-destructive' : 'bg-blue-500'
                      }`}
                    />
                    <span className="font-medium text-sm">{item.title}</span>
                  </div>

                  <p className="text-xs text-muted-foreground pl-4">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
