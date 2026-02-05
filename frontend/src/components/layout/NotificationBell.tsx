// frontend/src/components/layout/NotificationBell.tsx
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Bell, Info, AlertTriangle, CheckCircle2, Check, 
  Clock, Activity, AlertCircle 
} from 'lucide-react' // [CORREÇÃO] Removido 'X'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/app-routes'

// UI Components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"

// --- TYPES ---

type AlertType = 'PAF_NOT_STARTED' | 'PAF_REVIEW_OVERDUE' | 'RECEPTION_DELAY' | 'NOT_STARTED_YET' | 'PAF_STALLED'

interface AlertRaw {
  id: string
  nomeCompleto: string
  type: AlertType
  days: number
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA'
}

interface NotificationConfig {
  title: string
  description: string
  icon: React.ElementType
  bg: string
  critical: boolean
}

interface NotificationItem extends AlertRaw {
  config: NotificationConfig
}

// --- HELPERS ---

const getNotificationConfig = (type: string, days: number): NotificationConfig => {
  switch (type) {
    case 'PAF_NOT_STARTED':
      return { 
        title: 'Plano não iniciado', 
        description: 'Caso sem PAF cadastrado.',
        icon: AlertCircle, 
        bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        critical: true
      }
    case 'PAF_REVIEW_OVERDUE':
      return { 
        title: 'Revisão Vencida', 
        description: `PAF sem revisão há ${days} dias.`,
        icon: AlertTriangle, 
        bg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        critical: true
      }
    case 'RECEPTION_DELAY':
      return { 
        title: 'Acolhida Atrasada', 
        description: `Aguardando há ${days} dias.`,
        icon: Clock, 
        bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        critical: true
      }
    case 'NOT_STARTED_YET':
      return { 
        title: 'Não Iniciado', 
        description: `Atribuído há ${days} dias sem ação.`,
        icon: Clock, 
        bg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        critical: false
      }
    case 'PAF_STALLED':
      return { 
        title: 'Sem Evolução', 
        description: `Nenhum registro há ${days} dias.`,
        icon: Activity, 
        bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        critical: false
      }
    default:
      return { 
        title: 'Atenção Necessária', 
        description: 'Verifique o status do caso.',
        icon: Info, 
        bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        critical: false
      }
  }
}

const getCaseUrl = (id: string) => {
  if (typeof ROUTES.CASE_DETAIL === 'function') {
    return ROUTES.CASE_DETAIL(id)
  }
  return `/app/cases/${id}`
}

// --- COMPONENT ---

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sgac_read_notifications')
      if (stored) setReadIds(JSON.parse(stored))
    } catch (e) {
      console.error("Erro ao ler notificações salvas", e)
    }
  }, [])

  const { data: rawData } = useQuery({
    queryKey: ['notifications-bell'],
    queryFn: async () => (await api.get('/alerts')).data,
    refetchInterval: 1000 * 60 * 2,
    retry: false,
  })

  const notifications = useMemo<NotificationItem[]>(() => {
    let validList: AlertRaw[] = []

    if (Array.isArray(rawData)) {
      validList = rawData
    } else if (rawData?.data && Array.isArray(rawData.data)) {
      validList = rawData.data
    }

    return validList
      .filter(n => !readIds.includes(n.id))
      .map(n => ({
        ...n,
        config: getNotificationConfig(n.type, n.days)
      }))
      .sort((a, b) => {
        if (a.config.critical && !b.config.critical) return -1
        if (!a.config.critical && b.config.critical) return 1
        return b.days - a.days
      })
  }, [rawData, readIds])

  const criticalCount = notifications.filter(n => n.config.critical).length
  const hasNotifications = notifications.length > 0

  const handleRead = (id: string) => {
    const newReadIds = [...readIds, id]
    setReadIds(newReadIds)
    localStorage.setItem('sgac_read_notifications', JSON.stringify(newReadIds))
    setIsOpen(false)
  }

  const markAllAsRead = () => {
    const currentVisibleIds = notifications.map(n => n.id)
    const newReadIds = Array.from(new Set([...readIds, ...currentVisibleIds]))
    
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
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                criticalCount > 0 ? "bg-red-400" : "bg-blue-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                criticalCount > 0 ? "bg-red-500" : "bg-blue-500"
              )} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      {/* [CORREÇÃO TAILWIND] w-[380px] -> w-95 */}
      <PopoverContent align="end" className="w-95 p-0 shadow-xl border-border/60 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificações</h4>
            {hasNotifications && (
              <Badge variant="secondary" className="text-xs font-normal h-5 px-1.5">
                {notifications.length}
              </Badge>
            )}
          </div>
          
          {hasNotifications && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 hover:bg-background hover:text-primary transition-colors" 
                    onClick={markAllAsRead}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar todas como lidas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Lista */}
        {/* [CORREÇÃO TAILWIND] h-[350px] -> h-87.5 */}
        <ScrollArea className="h-87.5">
          {!hasNotifications ? (
            // [CORREÇÃO TAILWIND] h-[300px] -> h-75
            <div className="flex flex-col items-center justify-center h-75 text-muted-foreground gap-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-muted/50 p-4 rounded-full ring-1 ring-border/50">
                <CheckCircle2 className="h-8 w-8 opacity-50 text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground/80">Você não tem pendências urgentes.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((item) => {
                const Icon = item.config.icon
                return (
                  <Link 
                    key={item.id} 
                    to={getCaseUrl(item.id)}
                    onClick={() => handleRead(item.id)}
                    className="flex gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors items-start group relative"
                  >
                    {/* Ícone Indicativo */}
                    <div className={cn("mt-1 p-2 rounded-full shrink-0", item.config.bg)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                          {item.config.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {item.days}d atrás
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground/90 font-medium truncate">
                        {item.nomeCompleto}
                      </p>
                      
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.config.description}
                      </p>
                    </div>

                    {/* Dot de Urgência Alta */}
                    {item.urgencia === 'ALTA' && (
                      <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}