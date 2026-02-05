// frontend/src/components/case/CaseKanban.tsx
import { useMemo } from 'react' // [OTIMIZAÇÃO v1.1] Importado useMemo
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Clock, User, Fingerprint } from 'lucide-react'
import { cn } from '@/lib/utils'

import { ROUTES } from '@/constants/app-routes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getUrgencyColor } from '@/constants/cases/styles'
import type { CaseSummary } from '@/types/case'

interface CaseKanbanProps {
  cases: CaseSummary[]
  isLoading: boolean
}

// Configuração das Colunas (Visual Neutro)
const COLUMNS = [
  { id: 'AGUARDANDO_ACOLHIDA', title: 'Triagem', indicator: 'bg-blue-500' },
  { id: 'EM_ACOLHIDA', title: 'Em Acolhida', indicator: 'bg-indigo-500' },
  { id: 'AGUARDANDO_DISTRIBUICAO', title: 'Distribuição', indicator: 'bg-amber-500' },
  { id: 'EM_ACOLHIDA_ESPECIALIZADA', title: 'Acolhida Esp.', indicator: 'bg-purple-500' },
  { id: 'EM_ACOMPANHAMENTO', title: 'Acompanhamento', indicator: 'bg-emerald-500' },
  { id: 'EM_MONITORAMENTO', title: 'Monitoramento', indicator: 'bg-cyan-500' },
]

export function CaseKanban({ cases, isLoading }: CaseKanbanProps) {
  
  // [OTIMIZAÇÃO v1.1] Memoização do agrupamento
  // Evita recálculo O(N) a cada render do componente pai (Cases.tsx)
  const groupedCases = useMemo(() => {
    return COLUMNS.reduce((acc, col) => {
      acc[col.id] = cases.filter(c => c.status === col.id)
      return acc
    }, {} as Record<string, CaseSummary[]>)
  }, [cases])

  if (isLoading) return <KanbanSkeleton />

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-2 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {COLUMNS.map((col) => {
          const items = groupedCases[col.id] || []
          
          return (
            <div 
              key={col.id} 
              className="flex-1 min-w-75 max-w-85 flex flex-col h-full rounded-xl bg-muted/20 border border-border/40 shrink-0"
            >
              {/* Header da Coluna */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-3.5 border-b border-border/40 bg-muted/40 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2 h-2 rounded-full", col.indicator)} />
                  <h3 className="font-semibold text-xs text-foreground/80 uppercase tracking-wide">
                    {col.title}
                  </h3>
                </div>
                <Badge variant="secondary" className="bg-background text-muted-foreground font-mono text-[10px] h-5 min-w-6 justify-center shadow-none border border-border/50">
                  {items.length}
                </Badge>
              </div>

              {/* Lista de Cards */}
              <div className="flex-1 p-2 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/30">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center rounded-lg border border-dashed border-border/40 m-1 bg-background/30">
                    <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">Vazio</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <Link key={item.id} to={ROUTES.CASE_DETAIL(item.id)} className="block group focus:outline-none">
                      <Card className="relative shadow-sm hover:shadow-md transition-all duration-200 border border-border/60 hover:border-primary/30 bg-card group-hover:-translate-y-0.5">
                        
                        <CardHeader className="p-3 pb-2 space-y-2">
                          <div className="flex justify-between items-start">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] h-4 px-1.5 font-bold border bg-opacity-10 uppercase tracking-tight shadow-none",
                                getUrgencyColor(item.urgencia)
                              )}
                            >
                              {item.urgencia}
                            </Badge>
                            
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          
                          <CardTitle className="text-sm font-semibold leading-snug text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">
                            {item.nomeCompleto}
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-3 pt-0 space-y-3">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <User className="h-3 w-3 opacity-50 shrink-0" />
                            <span className="truncate max-w-45">
                              {item.especialistaPAEFI?.nome || item.agenteAcolhida?.nome || <span className="italic opacity-60">Sem responsável</span>}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 border-t pt-2 border-border/30">
                            <span className="flex items-center gap-1.5 font-medium group-hover:text-muted-foreground transition-colors">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}
                            </span>
                            
                            <span className="flex items-center gap-1 font-mono text-muted-foreground/40 group-hover:text-muted-foreground/60">
                              <Fingerprint className="h-2.5 w-2.5" />
                              {item.cpf.slice(0, 3)}...
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-hidden pb-6 pt-2 px-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-1 min-w-75 max-w-85 flex flex-col h-full rounded-xl bg-muted/30 border border-border/40">
          <div className="p-3.5 border-b border-border/40 flex items-center justify-between">
            <Skeleton className="h-4 w-20 bg-muted/50" />
            <Skeleton className="h-5 w-6 rounded-md bg-muted/50" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-28 rounded-lg border border-border/40 bg-card p-3 shadow-sm">
                <Skeleton className="h-4 w-12 bg-muted/50 mb-3" />
                <Skeleton className="h-4 w-full bg-muted/50 mb-2" />
                <Skeleton className="h-4 w-2/3 bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}