// frontend/src/components/CaseKanban.tsx
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Clock } from 'lucide-react' // [CORREÇÃO] Removido AlertCircle
import { clsx } from 'clsx'

import { ROUTES } from '@/constants/routes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getUrgencyColor } from '@/constants/caseConstants'
import type { CaseSummary } from '@/types/case'

interface CaseKanbanProps {
  cases: CaseSummary[]
  isLoading: boolean
}

const COLUMNS = [
  { id: 'AGUARDANDO_ACOLHIDA', title: 'Triagem', color: 'border-t-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-900/10' },
  { id: 'EM_ACOLHIDA', title: 'Em Acolhida', color: 'border-t-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
  { id: 'AGUARDANDO_DISTRIBUICAO_PAEFI', title: 'Aguardando Dist.', color: 'border-t-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10' },
  { id: 'EM_ACOLHIDA_ESPECIALIZADA', title: 'Acolhida Esp.', color: 'border-t-purple-500', bg: 'bg-purple-50/50 dark:bg-purple-900/10' },
  { id: 'EM_ACOMPANHAMENTO_PAEFI', title: 'Acompanhamento', color: 'border-t-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
]

export function CaseKanban({ cases, isLoading }: CaseKanbanProps) {
  
  const groupedCases = COLUMNS.reduce((acc, col) => {
    acc[col.id] = cases.filter(c => c.status === col.id)
    return acc
  }, {} as Record<string, CaseSummary[]>)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground animate-pulse">
        Carregando quadro...
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col items-center">
      <div className="flex h-full gap-4 overflow-x-auto pb-4 w-full px-4 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-1 min-w-[280px] max-w-[350px] flex flex-col h-full shadow-sm rounded-xl bg-muted/10 border flex-shrink-0">
            
            <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-4 ${col.color} ${col.bg} border-b`}>
              <h3 className="font-semibold text-xs text-foreground/80 uppercase tracking-wide">{col.title}</h3>
              <Badge variant="secondary" className="bg-background shadow-sm text-xs h-5 px-1.5">
                {groupedCases[col.id]?.length || 0}
              </Badge>
            </div>

            <div className="flex-1 p-2 overflow-y-auto min-h-[500px] scrollbar-thin scrollbar-thumb-muted-foreground/20">
              <div className="space-y-2">
                {groupedCases[col.id]?.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-24 text-center text-muted-foreground border-2 border-dashed border-muted-foreground/10 rounded-lg bg-background/30">
                    <p className="text-[10px] uppercase tracking-wide opacity-50">Vazio</p>
                  </div>
                )}

                {groupedCases[col.id]?.map((item) => (
                  <Card key={item.id} className="shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group relative bg-card border-border/60">
                    <CardHeader className="p-3 pb-0 space-y-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5 w-full">
                          <div className="flex justify-between items-start pr-6">
                             <Badge 
                              variant="outline" 
                              className={clsx("text-[9px] h-4 px-1.5 font-normal", getUrgencyColor(item.urgencia))}
                            >
                              {item.urgencia}
                            </Badge>
                          </div>
                          
                          <Link to={ROUTES.CASE_DETAIL(item.id)} className="block">
                            <CardTitle className="text-sm font-semibold leading-tight hover:text-primary transition-colors line-clamp-2">
                              {item.nomeCompleto}
                            </CardTitle>
                          </Link>
                        </div>
                        
                        <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link to={ROUTES.CASE_DETAIL(item.id)}>
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-3 pt-3">
                      <p className="text-xs text-muted-foreground mb-3 truncate flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                        {item.especialistaPAEFI?.nome || item.agenteAcolhida?.nome || 'Sem técnico'}
                      </p>
                      
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2 border-border/50">
                        <span className="flex items-center gap-1" title={`Entrada: ${new Date(item.dataEntrada).toLocaleDateString()}`}>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: false })}
                        </span>
                        
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[9px]">
                          {item.cpf.slice(0, 3)}...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}