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
    style: 'text-status-success-fg bg-status-success-bg border-status-success-border' 
  },
  { 
    match: ['URGENCIA', 'RISCO', 'CRITICO'], 
    icon: AlertCircle, 
    style: 'text-status-error-fg bg-status-error-bg border-status-error-border' 
  },
  { 
    match: ['EVOLUCAO', 'ATENDIMENTO', 'INTERVENCAO'], 
    icon: MessageSquare, 
    style: 'text-status-info-fg bg-status-info-bg border-status-info-border' 
  },
  { 
    match: ['PAF', 'PLANO', 'DOCUMENTO'], 
    icon: FileText, 
    style: 'text-status-ai-fg bg-status-ai-bg border-status-ai-border' 
  },
  { 
    match: ['DESLIGAMENTO', 'FINALIZADO', 'ENCERRAMENTO'], 
    icon: CheckCircle2, 
    style: 'text-status-neutral-fg bg-status-neutral-bg border-status-neutral-border' 
  },
  { 
    match: ['EDICAO', 'ATUALIZACAO', 'ALTERACAO'], 
    icon: FileEdit, 
    style: 'text-status-warning-fg bg-status-warning-bg border-status-warning-border' 
  }
]

const getActivityConfig = (action: string) => {
  const config = ACTION_CONFIG.find(c => c.match.some(key => action.toUpperCase().includes(key)))
  return config || { 
    icon: Activity, 
    style: 'text-muted-foreground bg-muted border-border' 
  }
}

// --- SUB-COMPONENTE: ITEM DA LISTA ---
function ActivityItem({ log, isLast }: { log: ActivityLog, isLast: boolean }) {
  const { icon: Icon, style } = getActivityConfig(log.acao)
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), { locale: ptBR, addSuffix: true })

  return (
    <div className="flex gap-4 group relative">
      {/* Coluna da Linha do Tempo */}
      <div className="flex flex-col items-center min-w-8">
        {!isLast && (
           <div className="absolute top-8 -bottom-2 left-[15.5px] w-px bg-border/60 group-hover:bg-primary/20 transition-colors" />
        )}
        <div className={cn(
          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all duration-300 group-hover:scale-110 shrink-0",
          style
        )}>
          <Icon className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>

      {/* Coluna de Conteúdo */}
      <div className={cn("flex-1 pb-6 pt-1 space-y-1.5 min-w-0", isLast ? "pb-2" : "")}>
        <div className="flex justify-between items-start gap-3">
          <p className="text-sm font-medium leading-snug text-foreground/90 line-clamp-2 group-hover:text-primary transition-colors">
            {log.descricao}
          </p>
          <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap tabular-nums shrink-0 mt-0.5 bg-background px-1.5 py-0.5 rounded-md border border-transparent group-hover:border-border transition-colors">
            {timeAgo}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {log.caso && (
            <span className="inline-flex items-center font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 max-w-40 truncate hover:bg-primary/10 transition-colors">
              {log.caso.nomeCompleto}
            </span>
          )}
          {log.autor && (
            <span className="flex items-center gap-1 opacity-70">
              <span className="text-[10px] uppercase tracking-wider">por</span> 
              <span className="font-medium text-foreground capitalize">{log.autor.nome.split(' ')[0].toLowerCase()}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
interface RecentActivityFeedProps { className?: string }

export function RecentActivityFeed({ className }: RecentActivityFeedProps) {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => (await api.get('/stats/activity')).data,
    refetchInterval: 15000 
  })

  return (
    <Card className={cn("flex flex-col border shadow-sm overflow-hidden bg-card", className)}>
      <CardHeader className="pb-3 px-5 py-4 shrink-0 border-b border-border/40">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold">
           <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-status-ai-bg border border-status-ai-border text-status-ai-fg">
              <History className="h-4 w-4" />
           </div>
           <span className="text-foreground">Feed de Atividades</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-0 relative">
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
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/60">
                  <div className="p-3 bg-muted/30 rounded-full mb-2">
                     <Activity className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma atividade recente.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {logs?.map((log, index) => (
                    <ActivityItem key={log.id} log={log} isLast={index === (logs.length - 1)} />
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