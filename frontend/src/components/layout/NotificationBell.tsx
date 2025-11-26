// frontend/src/components/layout/NotificationBell.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Info, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
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

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)

  // Busca notificações a cada 60 segundos
  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications-bell'],
    queryFn: async () => {
      const res = await api.get('/alerts')
      return res.data
    },
    refetchInterval: 1000 * 60, // 1 minuto
  })

  const criticalCount = notifications.filter(n => n.type === 'critical').length
  const hasNotifications = notifications.length > 0

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {hasNotifications && (
            <span 
              className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full border border-background ${criticalCount > 0 ? 'bg-destructive' : 'bg-blue-500'}`} 
            />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notificações</h4>
          {hasNotifications && <Badge variant="secondary">{notifications.length}</Badge>}
        </div>
        
        <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <Bell className="h-8 w-8 opacity-20" />
                    <p>Tudo em dia!</p>
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
                                {item.type === 'critical' 
                                  ? <AlertTriangle className="h-4 w-4 text-destructive" />
                                  : <Info className="h-4 w-4 text-blue-500" />
                                }
                                <span className="font-medium text-sm">{item.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
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