// frontend/src/components/dashboard/RecentActivityFeed.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Activity, FileText, UserPlus, CheckCircle2, AlertCircle, 
  MessageSquare, History, FileEdit} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
interface ActivityLog {
  id: string
  acao: string
  descricao: string
  createdAt: string
  caso?: { nomeCompleto: string }
  autor?: { nome: string }
}

// --- CONFIGURAÇÃO VISUAL ---
const ACTION_CONFIG = [
  { 
    match: ['CRIACAO', 'ADICIONADO', 'CADASTRO'], 
    icon: UserPlus, 
    style: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
  },
  { 
    match: ['URGENCIA', 'RISCO'], 
    icon: AlertCircle, 
    style: 'text-rose-600 bg-rose-100 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' 
  },
  { 
    match: ['EVOLUCAO', 'ATENDIMENTO'], 
    icon: MessageSquare, 
    style: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
  },
  { 
    match: ['PAF', 'PLANO'], 
    icon: FileText, 
    style: 'text-violet-600 bg-violet-100 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' 
  },
  { 
    match: ['DESLIGAMENTO', 'FINALIZADO'], 
    icon: CheckCircle2, 
    style: 'text-slate-600 bg-slate-100 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800' 
  },
  { 
    match: ['EDICAO', 'ATUALIZACAO'], 
    icon: FileEdit, 
    style: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
  }
]

const getActivityConfig = (action: string) => {
  const config = ACTION_CONFIG.find(c => c.match.some(key => action.includes(key)))
  return config || { icon: Activity, style: 'text-muted-foreground bg-muted border-border' }
}

// --- SUB-COMPONENTE: ITEM DA LISTA ---
function ActivityItem({ log, isLast }: { log: ActivityLog, isLast: boolean }) {
  const { icon: Icon, style } = getActivityConfig(log.acao)
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), { locale: ptBR, addSuffix: true })

  return (
    <div className="flex gap-4 group relative">
      {/* Coluna da Linha do Tempo */}
      <div className="flex flex-col items-center min-w-[32px]">
        <div className={cn(
          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all group-hover:scale-110 shrink-0",
          style
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border group-hover:bg-primary/20 transition-colors my-1" />
        )}
      </div>

      {/* Coluna de Conteúdo */}
      <div className="flex-1 pb-6 pt-1 space-y-1.5 min-w-0">
        <div className="flex justify-between items-start gap-3">
          <p className="text-sm font-medium leading-tight text-foreground/90 line-clamp-2">
            {log.descricao}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums shrink-0 mt-0.5">
            {timeAgo}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {log.caso && (
            <span className="font-medium text-primary/90 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 max-w-[180px] truncate block">
              {log.caso.nomeCompleto}
            </span>
          )}
          {log.autor && (
            <span className="flex items-center gap-1 opacity-80">
              por <span className="font-medium text-foreground capitalize">{log.autor.nome.split(' ')[0].toLowerCase()}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- PROPS INTERFACE ---
interface RecentActivityFeedProps {
  className?: string
}

// --- COMPONENTE PRINCIPAL ---
export function RecentActivityFeed({ className }: RecentActivityFeedProps) {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => (await api.get('/stats/activity')).data,
    refetchInterval: 15000 
  })

  return (
    <Card className={cn("flex flex-col border shadow-sm overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b bg-muted/20 px-4 py-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <History className="h-4 w-4 text-primary" />
          Feed de Atividades
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-0 relative bg-card">
        {/* Absolute inset trick for perfect scroll height */}
        <div className="absolute inset-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1 pt-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-60">
                  <Activity className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma atividade recente.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {logs?.map((log, index) => (
                    <ActivityItem 
                      key={log.id} 
                      log={log} 
                      isLast={index === (logs.length - 1)} 
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}