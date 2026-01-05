import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Activity, FileText, UserPlus, CheckCircle2, AlertCircle, MessageSquare 
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

const getIconForAction = (action: string) => {
  if (action.includes('CRIACAO') || action.includes('ADICIONADO')) return UserPlus
  if (action.includes('EVOLUCAO')) return MessageSquare
  if (action.includes('PAF')) return FileText
  if (action.includes('DESLIGAMENTO')) return CheckCircle2
  if (action.includes('URGENCIA')) return AlertCircle
  return Activity
}

export function RecentActivityFeed() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => (await api.get('/stats/activity')).data,
    refetchInterval: 15000 
  })

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-5 w-5 text-blue-600" />
          Aconteceu Agora
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[350px] px-6 pb-4">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {logs?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>
              )}

              {logs?.map((log: any, index: number) => {
                // [CORREÇÃO] Usando o Icon
                const Icon = getIconForAction(log.acao)
                
                return (
                  <div key={log.id} className="relative pl-6 pb-1 group">
                    {index !== logs.length - 1 && (
                      <div className="absolute left-[9px] top-3 bottom-[-24px] w-px bg-border group-hover:bg-primary/30 transition-colors" />
                    )}
                    
                    <div className="absolute left-0 top-1.5 h-[18px] w-[18px] rounded-full border bg-background flex items-center justify-center z-10 group-hover:border-primary transition-colors">
                      {/* Usando o ícone aqui em tamanho reduzido */}
                      <Icon className="h-3 w-3 text-primary" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium leading-none text-foreground/90">
                          {log.descricao}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(log.createdAt), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                          {log.caso?.nomeCompleto || 'Sistema'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{log.autor?.nome.split(' ')[0].toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}