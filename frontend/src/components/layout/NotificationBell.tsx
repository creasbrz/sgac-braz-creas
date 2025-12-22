// frontend/src/components/layout/NotificationBell.tsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Info, AlertTriangle, CheckCircle2, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NotificationItem {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'info'
  date?: string
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])

  // 1. Carregar notificações lidas do LocalStorage ao iniciar
  useEffect(() => {
    const stored = localStorage.getItem('sgac_read_notifications')
    if (stored) {
      setReadIds(JSON.parse(stored))
    }
  }, [])

  const { data: rawNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications-bell'],
    queryFn: async () => {
      const res = await api.get('/alerts')
      return res.data
    },
    refetchInterval: 1000 * 60 * 2,
    retry: false
  })

  // 2. Filtrar notificações que JÁ foram clicadas (lidas)
  const notifications = rawNotifications.filter(n => !readIds.includes(n.id))

  const criticalCount = notifications.filter(n => n.type === 'critical').length
  const hasNotifications = notifications.length > 0

  // 3. Função para marcar como lida ao clicar
  const handleRead = (id: string) => {
    const newReadIds = [...readIds, id]
    setReadIds(newReadIds)
    localStorage.setItem('sgac_read_notifications', JSON.stringify(newReadIds))
    setIsOpen(false)
  }

  // 4. Função para limpar tudo
  const markAllAsRead = () => {
    const allIds = rawNotifications.map(n => n.id)
    const newReadIds = [...new Set([...readIds, ...allIds])] // Merge unique IDs
    setReadIds(newReadIds)
    localStorage.setItem('sgac_read_notifications', JSON.stringify(newReadIds))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted/60 transition-all">
          <Bell className="h-5 w-5 text-muted-foreground" />
          
          {hasNotifications && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${criticalCount > 0 ? 'bg-red-400' : 'bg-blue-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${criticalCount > 0 ? 'bg-red-500' : 'bg-blue-500'}`}></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-[340px] p-0 shadow-lg border-muted/40">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/10">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificações</h4>
            {hasNotifications && <Badge variant="secondary" className="text-xs font-normal h-5">{notifications.length}</Badge>}
          </div>
          
          {hasNotifications && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={markAllAsRead}>
                    <Check className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar todas como lidas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <ScrollArea className="h-[320px]">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-3 animate-in fade-in">
                    <div className="bg-muted/30 p-3 rounded-full">
                        <CheckCircle2 className="h-6 w-6 opacity-50" />
                    </div>
                    <p className="text-sm">Tudo em dia por aqui!</p>
                </div>
            ) : (
                <div className="divide-y">
                    {notifications.map((item) => (
                        <Link 
                            key={item.id} 
                            to={item.link}
                            onClick={() => handleRead(item.id)} // [AQUI] Marca como lido ao clicar
                            className="flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors items-start group"
                        >
                            <div className={`mt-1 p-1.5 rounded-full shrink-0 ${item.type === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {item.type === 'critical' 
                                  ? <AlertTriangle className="h-4 w-4" />
                                  : <Info className="h-4 w-4" />
                                }
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                    {item.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                </p>
                                {item.date && (
                                    <p className="text-[10px] text-muted-foreground/60 pt-1">
                                        {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: ptBR })}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}