import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Info, AlertTriangle, CheckCircle2, Check, Clock, Activity, AlertCircle } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ROUTES } from '@/constants/routes'

// Interface que espelha o retorno do Backend
interface AlertRaw {
  id: string
  nomeCompleto: string
  type: 'PAF_NOT_STARTED' | 'PAF_REVIEW_OVERDUE' | 'RECEPTION_DELAY' | 'NOT_STARTED_YET' | 'PAF_STALLED'
  days: number
  urgencia?: string
}

// Configuração visual (Cores, Ícones e Textos)
const getNotificationConfig = (type: string, days: number) => {
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

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])

  // 1. Carregar lidas do LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem('sgac_read_notifications')
    if (stored) {
      try {
        setReadIds(JSON.parse(stored))
      } catch (e) {
        console.error("Erro ao ler notificações salvas", e)
      }
    }
  }, [])

  // 2. Buscar dados do Backend
  // Usamos 'any' aqui temporariamente para permitir a checagem segura abaixo
  const { data: rawData } = useQuery({
    queryKey: ['notifications-bell'],
    queryFn: async () => {
      const res = await api.get('/alerts')
      return res.data
    },
    refetchInterval: 1000 * 60 * 2, // 2 minutos
    retry: false,
    initialData: [], // Evita undefined no primeiro render
  })

  // 3. Processamento Seguro (CORREÇÃO DO CRASH)
  // Normaliza os dados para garantir que sempre teremos um Array,
  // independente se a API retornou [], null, ou { data: [] }
  const validNotifications: AlertRaw[] = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    // @ts-ignore - Verifica se existe propriedade data que é array
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  // 4. Filtrar Lidas e Aplicar Configuração Visual
  const notifications = useMemo(() => {
    return validNotifications
      .filter(n => !readIds.includes(n.id))
      .map(n => ({
        ...n,
        config: getNotificationConfig(n.type, n.days)
      }))
  }, [validNotifications, readIds])

  const criticalCount = notifications.filter(n => n.config.critical).length
  const hasNotifications = notifications.length > 0

  // 5. Ações
  const handleRead = (id: string) => {
    const newReadIds = [...readIds, id]
    setReadIds(newReadIds)
    localStorage.setItem('sgac_read_notifications', JSON.stringify(newReadIds))
    setIsOpen(false)
  }

  const markAllAsRead = () => {
    const allIds = validNotifications.map(n => n.id)
    // Mescla IDs antigos com os novos, removendo duplicatas
    const newReadIds = [...new Set([...readIds, ...allIds])]
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
                    {notifications.map((item) => {
                        const Icon = item.config.icon
                        return (
                          <Link 
                            key={item.id} 
                            // [CORREÇÃO] Usa a função do routes.ts para gerar a URL correta (/app/cases/:id)
                            to={typeof ROUTES.CASE_DETAIL === 'function' ? ROUTES.CASE_DETAIL(item.id) : `${ROUTES.APP}/cases/${item.id}`}
                            onClick={() => handleRead(item.id)}
                            className="flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors items-start group relative"
                          >
                            {/* Ícone Colorido */}
                            <div className={`mt-1 p-1.5 rounded-full shrink-0 ${item.config.bg}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-hidden">
                                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors flex justify-between">
                                    {item.config.title}
                                </p>
                                <p className="text-sm text-foreground/90 font-medium truncate">
                                    {item.nomeCompleto}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.config.description}
                                </p>
                            </div>

                            {/* Indicador de Urgência Alta */}
                            {item.urgencia === 'ALTA' && (
                                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" title="Urgência Alta" />
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