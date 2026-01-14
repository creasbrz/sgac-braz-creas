// frontend/src/components/CaseKanban.tsx
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Clock, User, Fingerprint } from 'lucide-react'
import { cn } from '@/lib/utils' // Assumindo que você tenha o helper 'cn' do shadcn

import { ROUTES } from '@/constants/app-routes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUrgencyColor } from '@/constants/cases/styles'
import type { CaseSummary } from '@/types/case'

interface CaseKanbanProps {
  cases: CaseSummary[]
  isLoading: boolean
}

const COLUMNS = [
  { id: 'AGUARDANDO_ACOLHIDA', title: 'Triagem', color: 'bg-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-900/10' },
  { id: 'EM_ACOLHIDA', title: 'Em Acolhida', color: 'bg-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
  { id: 'AGUARDANDO_DISTRIBUICAO', title: 'Distribuição', color: 'bg-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10' },
  { id: 'EM_ACOLHIDA_ESPECIALIZADA', title: 'Acolhida Esp.', color: 'bg-purple-500', bg: 'bg-purple-50/50 dark:bg-purple-900/10' },
  { id: 'EM_ACOMPANHAMENTO', title: 'Acompanhamento', color: 'bg-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
  { id: 'EM_MONITORAMENTO', title: 'Monitoramento', color: 'bg-cyan-500', bg: 'bg-cyan-50/50 dark:bg-cyan-900/10' },
]

export function CaseKanban({ cases, isLoading }: CaseKanbanProps) {
  
  const groupedCases = COLUMNS.reduce((acc, col) => {
    acc[col.id] = cases.filter(c => c.status === col.id)
    return acc
  }, {} as Record<string, CaseSummary[]>)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-muted-foreground gap-4">
        <Clock className="h-8 w-8 animate-spin text-primary/40" />
        <p className="animate-pulse font-medium">Sincronizando quadro de processos...</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="flex h-full gap-4 overflow-x-auto pb-6 pt-2 px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className="flex-1 min-w-[300px] max-w-[350px] flex flex-col h-full rounded-xl bg-muted/20 border border-border/50 flex-shrink-0"
          >
            {/* Column Header - Sticky */}
            <div className={cn(
              "sticky top-0 z-10 flex items-center justify-between p-3.5 rounded-t-xl border-b backdrop-blur-sm",
              col.bg
            )}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", col.color)} />
                <h3 className="font-bold text-[11px] text-foreground/70 uppercase tracking-widest">{col.title}</h3>
              </div>
              <Badge variant="secondary" className="bg-background/80 shadow-sm text-[11px] font-bold tabular-nums h-5 px-1.5">
                {groupedCases[col.id]?.length || 0}
              </Badge>
            </div>

            {/* Cards Container */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-none hover:scrollbar-thin scrollbar-thumb-muted-foreground/10">
              {groupedCases[col.id]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted-foreground/10 rounded-xl bg-background/20 opacity-60">
                  <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/50">Nenhum processo</p>
                </div>
              ) : (
                groupedCases[col.id]?.map((item) => (
                  <Link key={item.id} to={ROUTES.CASE_DETAIL(item.id)} className="block group">
                    <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30 group-hover:-translate-y-1">
                      
                      {/* Urgency Accent Bar */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        getUrgencyColor(item.urgencia).split(' ')[0].replace('text-', 'bg-') // Extrai a cor do texto para o background
                      )} />

                      <CardHeader className="p-3 pb-2 space-y-2">
                        <div className="flex justify-between items-start">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] h-4 px-1.5 font-bold border-none bg-muted/50",
                              getUrgencyColor(item.urgencia)
                            )}
                          >
                            {item.urgencia}
                          </Badge>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <CardTitle className="text-sm font-bold leading-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">
                          {item.nomeCompleto}
                        </CardTitle>
                      </CardHeader>
                      
                      <CardContent className="p-3 pt-0 space-y-3">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3 opacity-60" />
                          <span className="truncate italic">
                            {item.especialistaPAEFI?.nome || item.agenteAcolhida?.nome || 'Pendente de atribuição'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 border-t pt-2.5 border-border/40">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}
                          </span>
                          
                          <span className="flex items-center gap-1 font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/20">
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
        ))}
      </div>
    </div>
  )
}