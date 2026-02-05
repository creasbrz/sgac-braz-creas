// frontend/src/components/dashboard/UpcomingPafDeadlines.tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  AlertTriangle, ArrowRight, CheckCircle2, 
  Clock, AlertCircle, Info, LucideIcon 
} from 'lucide-react'
import { formatDistanceToNow, isValid, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
interface AlertItem {
  id: string
  title: string
  description: string
  link: string
  type: 'critical' | 'warning' | 'info'
  dueDate?: string 
}

// --- CONFIGURAÇÃO DE ESTILOS (Usa Tokens Semânticos do CSS) ---
const ALERT_STYLES: Record<string, { 
    icon: LucideIcon, 
    colorClass: string, 
    bgClass: string,
    borderClass: string,
    badgeVariant: "destructive" | "secondary" | "outline" | "default"
}> = {
  critical: {
    icon: AlertCircle,
    colorClass: "text-status-error-fg",
    bgClass: "bg-status-error-bg",
    borderClass: "border-status-error-border",
    badgeVariant: "destructive"
  },
  warning: {
    icon: Clock,
    colorClass: "text-status-warning-fg",
    bgClass: "bg-status-warning-bg",
    borderClass: "border-status-warning-border",
    badgeVariant: "secondary"
  },
  info: {
    icon: Info,
    colorClass: "text-status-info-fg",
    bgClass: "bg-status-info-bg",
    borderClass: "border-status-info-border",
    badgeVariant: "outline"
  }
}

interface UpcomingPafDeadlinesProps {
  className?: string
}

export function UpcomingPafDeadlines({ className }: UpcomingPafDeadlinesProps) {
  const { data: alerts, isLoading, isError } = useQuery<AlertItem[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      try {
        const res = await api.get('/alerts')
        if (!Array.isArray(res.data)) return []
        
        return res.data
          .filter((item: AlertItem) => 
            item.title.includes('PAF') || 
            item.id.startsWith('paf-') ||
            item.type === 'critical'
          )
          .sort((a, b) => {
             // Ordena por Criticidade primeiro, depois mantém a ordem
             if (a.type === 'critical' && b.type !== 'critical') return -1;
             if (b.type === 'critical' && a.type !== 'critical') return 1;
             return 0;
          })
      } catch {
        return []
      }
    },
    refetchInterval: 1000 * 60 
  })

  // Helper de Data
  const renderDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (!isValid(date)) return null
    
    const isOverdue = isPast(date)
    const text = formatDistanceToNow(date, { locale: ptBR, addSuffix: true })
    
    return { text, isOverdue }
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const hasAlerts = safeAlerts.length > 0
  const criticalCount = safeAlerts.filter(a => a.type === 'critical').length

  return (
    <Card className={cn("flex flex-col border shadow-sm overflow-hidden bg-card", className)}>
      <CardHeader className="pb-3 px-5 py-4 shrink-0 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2.5">
            {/* Ícone do Título também usa cor semântica (Warning neste caso) */}
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-status-warning-bg border border-status-warning-border">
                <AlertTriangle className="h-4 w-4 text-status-warning-fg" />
            </div>
            <span className="text-foreground">Prazos e Alertas PAF</span>
          </CardTitle>
          
          {hasAlerts && (
            <Badge 
              variant={criticalCount > 0 ? "destructive" : "secondary"} 
              className="h-5 px-1.5 text-[10px]"
            >
              {safeAlerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 min-h-0 relative">
        {/* ScrollArea com posicionamento absoluto para respeitar o grid pai */}
        <div className="absolute inset-0">
          <ScrollArea className="h-full">
            <div className="p-0">
              
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/20 animate-pulse">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-80 p-4">
                  <div className="p-3 rounded-full bg-status-error-bg border border-status-error-border">
                    <AlertCircle className="h-6 w-6 text-status-error-fg" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Erro ao carregar alertas.</span>
                </div>
              ) : !hasAlerts ? (
                // --- EMPTY STATE (SUCCESS) ---
                <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                  {/* Usa Tokens Semânticos de Sucesso */}
                  <div className="p-4 rounded-full bg-status-success-bg border border-status-success-border mb-3 animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-8 w-8 text-status-success-fg" />
                  </div>
                  <h4 className="font-semibold text-foreground">Tudo em dia!</h4>
                  <p className="text-xs mt-1 text-muted-foreground max-w-50 leading-relaxed">
                    Não há pendências de PAF ou prazos críticos no momento.
                  </p>
                </div>
              ) : (
                // --- LISTA DE ALERTAS ---
                <ul className="divide-y divide-border/40">
                  {safeAlerts.slice(0, 10).map((item) => {
                    const style = ALERT_STYLES[item.type] || ALERT_STYLES.info
                    const StatusIcon = style.icon
                    const dateInfo = renderDate(item.dueDate)

                    return (
                      <li key={item.id} className="group hover:bg-muted/30 transition-colors duration-200">
                        <div className="p-4 flex flex-col gap-3">
                           {/* Header da linha */}
                           <div className="flex items-start gap-3.5">
                              {/* Ícone com Cores Semânticas (Pastel + Vivo) */}
                              <div className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm", 
                                style.bgClass,
                                style.borderClass
                              )}>
                                <StatusIcon className={cn("h-4 w-4", style.colorClass)} />
                              </div>
                              
                              <div className="flex-1 min-w-0 pt-0.5">
                                <h4 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                                
                                {dateInfo && (
                                  <div className={cn(
                                    "flex items-center gap-1.5 mt-2.5 text-[11px] font-medium border w-fit px-2 py-0.5 rounded-md",
                                    dateInfo.isOverdue 
                                        ? "bg-status-error-bg text-status-error-fg border-status-error-border" 
                                        : "bg-muted/50 text-muted-foreground border-border"
                                  )}>
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {dateInfo.isOverdue ? "Venceu " : "Vence "} 
                                      {dateInfo.text}
                                    </span>
                                  </div>
                                )}
                              </div>
                           </div>

                           {/* Ação (Resolver) */}
                           <div className="pl-11.5">
                             <Button 
                               asChild 
                               variant="ghost" 
                               size="sm" 
                               className="h-7 text-xs px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 -ml-2"
                             >
                               <Link to={item.link} className="flex items-center gap-1.5">
                                 Resolver Pendência
                                 <ArrowRight className="h-3 w-3 opacity-70 group-hover:translate-x-1 transition-transform" />
                               </Link>
                             </Button>
                           </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}