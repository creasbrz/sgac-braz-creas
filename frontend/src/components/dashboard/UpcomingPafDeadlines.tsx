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

// Styles configuration based on alert type
const ALERT_STYLES: Record<string, { 
    icon: LucideIcon, 
    colorClass: string, 
    bgClass: string, 
    badgeVariant: "destructive" | "secondary" | "outline" | "default"
}> = {
  critical: {
    icon: AlertCircle,
    colorClass: "text-destructive",
    bgClass: "bg-destructive/10",
    badgeVariant: "destructive"
  },
  warning: {
    icon: Clock,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-100 dark:bg-amber-900/20",
    badgeVariant: "secondary"
  },
  info: {
    icon: Info,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/20",
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
             // Sort by Criticality first, then by Date if available
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

  // Date helper
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
    <Card className={cn("flex flex-col border shadow-sm overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b bg-muted/20 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-semibold">Prazos e Alertas PAF</span>
          </CardTitle>
          {hasAlerts && (
            <Badge 
              variant={criticalCount > 0 ? "destructive" : "secondary"} 
              className="text-[10px] h-5 px-1.5"
            >
              {safeAlerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 min-h-0 relative bg-card">
        {/* Absolute positioning for ScrollArea ensures it respects parent height */}
        <div className="absolute inset-0">
          <ScrollArea className="h-full">
            <div className="p-0">
              
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/10 animate-pulse">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center h-48 text-destructive gap-2 opacity-80">
                  <AlertCircle className="h-8 w-8" />
                  <span className="text-sm font-medium">Erro ao carregar alertas.</span>
                </div>
              ) : !hasAlerts ? (
                // Empty State
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-6">
                  <div className="bg-emerald-100 dark:bg-emerald-900/20 p-4 rounded-full mb-3 animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-medium text-foreground">Tudo em dia!</h4>
                  <p className="text-xs mt-1 opacity-70 max-w-[180px]">
                    Não há pendências de PAF ou prazos críticos no momento.
                  </p>
                </div>
              ) : (
                // Listagem Refatorada
                <ul className="divide-y divide-border/50">
                  {safeAlerts.slice(0, 10).map((item) => {
                    const style = ALERT_STYLES[item.type] || ALERT_STYLES.info
                    const StatusIcon = style.icon
                    const dateInfo = renderDate(item.dueDate)

                    return (
                      <li key={item.id} className="group hover:bg-muted/40 transition-colors duration-200">
                        <div className="p-4 flex flex-col gap-3">
                           {/* Header da linha */}
                           <div className="flex items-start gap-3">
                              <div className={cn("mt-0.5 p-1.5 rounded-md shrink-0", style.bgClass)}>
                                <StatusIcon className={cn("h-4 w-4", style.colorClass)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                                
                                {dateInfo && (
                                  <div className={cn(
                                    "flex items-center gap-1.5 mt-2 text-[11px] font-medium",
                                    dateInfo.isOverdue ? "text-destructive" : "text-muted-foreground"
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

                           {/* Action Footer (Only visible/highlighted on context) */}
                           <div className="pl-10">
                             <Button 
                               asChild 
                               variant="ghost" 
                               size="sm" 
                               className="h-7 text-xs px-2 -ml-2 text-muted-foreground hover:text-primary hover:bg-primary/10 w-fit"
                             >
                               <Link to={item.link} className="flex items-center">
                                 Resolver Pendência
                                 <ArrowRight className="h-3 w-3 ml-1.5 opacity-70 group-hover:translate-x-1 transition-transform" />
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