import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { 
  PlusCircle, RefreshCw, UserPlus, Power, AlertCircle, FileEdit, ArrowRight, Loader2, ShieldCheck 
} from 'lucide-react'
import { formatDateSafe } from '@/utils/formatters'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CaseLog } from '@/types/case'

interface CaseHistoryProps {
  logs?: CaseLog[]
  caseId?: string
  showOnlyLogs?: boolean 
}

export function CaseHistory({ logs: initialLogs, caseId }: CaseHistoryProps) {
  
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['case-logs', caseId],
    queryFn: async () => {
      if (!caseId) return []
      const res = await api.get(`/cases/${caseId}`)
      return res.data.logs || []
    },
    enabled: !initialLogs && !!caseId,
  })

  const logs = initialLogs || fetchedData || []

  const getLogConfig = (acao: string) => {
    switch (acao) {
      case 'CRIACAO': return { icon: PlusCircle, color: 'text-blue-600', bg: 'bg-blue-50' }
      case 'MUDANCA_STATUS': return { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' }
      case 'ATRIBUICAO': return { icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' }
      case 'DESLIGAMENTO': return { icon: Power, color: 'text-red-600', bg: 'bg-red-50' }
      case 'OUTRO': return { icon: FileEdit, color: 'text-slate-600', bg: 'bg-slate-50' }
      case 'EVOLUCAO_CRIADA': return { icon: FileEdit, color: 'text-emerald-600', bg: 'bg-emerald-50' }
      default: return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100' }
    }
  }

  const parseChanges = (jsonString?: string | null) => {
    if (!jsonString) return null;
    try {
      const changes = JSON.parse(jsonString);
      if (typeof changes === 'object' && changes !== null) return changes;
      return null;
    } catch { return null; }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      {/* Header discreto para explicar o que é esta aba */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground border border-border/50">
        <ShieldCheck className="h-4 w-4" />
        <span>Este é o registro de auditoria automática do sistema. Para anotações técnicas, use a aba <strong>Evoluções</strong>.</span>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de auditoria.</p>
          ) : (
            <div className="relative ml-3 space-y-0">
              {/* Linha Vertical Contínua */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/60 -z-10" />

              {logs.map((log: CaseLog) => {
                const config = getLogConfig(log.acao)
                const Icon = config.icon
                const changes = parseChanges(log.valorAnterior)

                return (
                  <div key={log.id} className="relative pl-10 py-3 group hover:bg-muted/30 rounded-md transition-colors -ml-2 pr-2">
                    {/* Ícone (Dot) */}
                    <span className={`absolute left-0 top-3.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm z-10`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-sm font-medium text-foreground">
                          {log.descricao}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateSafe(log.createdAt).replace(' ', ' • ')}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span>Usuário: <span className="font-medium text-foreground/80">{log.autor?.nome ?? 'Sistema'}</span></span>
                      </div>

                      {/* DIFF VISUAL (Mais compacto para auditoria) */}
                      {changes && (
                        <div className="mt-2 bg-background border rounded-sm p-2 text-[11px] grid gap-1 shadow-sm">
                          {Object.entries(changes).map(([field, diff]: any) => (
                            <div key={field} className="grid grid-cols-[100px_1fr_10px_1fr] items-center gap-2">
                              <span className="font-semibold text-muted-foreground truncate" title={field}>
                                {field.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <span className="text-destructive/80 line-through truncate text-right px-1 bg-red-50 rounded">
                                {String(diff.from || 'Vazio')}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground mx-auto" />
                              <span className="text-emerald-700 font-medium truncate px-1 bg-emerald-50 rounded">
                                {String(diff.to || 'Vazio')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!changes && log.valorAnterior && log.valorNovo) && (
                        <div className="flex items-center gap-2 text-[11px] mt-1">
                           <Badge variant="outline" className="font-normal text-muted-foreground h-5">{log.valorAnterior}</Badge>
                           <ArrowRight className="h-3 w-3 text-muted-foreground" />
                           <Badge variant="outline" className="font-medium bg-primary/5 text-primary border-primary/20 h-5">{log.valorNovo}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}