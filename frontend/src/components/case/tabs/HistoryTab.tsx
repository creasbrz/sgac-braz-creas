// frontend/src/components/case/tabs/HistoryTab.tsx
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format, isToday, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  PlusCircle, RefreshCw, UserPlus, Power, FileText, 
  ArrowRight, Loader2, ShieldCheck, Briefcase, ChevronDown, Filter, History
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CaseLog, Evolution } from '@/types/case'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

type LogChanges = Record<string, { from: string | null; to: string | null }>

type LogMeta = {
  kind: 'LOG'
  acao: string
  changes?: LogChanges
  oldVal?: string | null
  newVal?: string | null
}

type EvolutionMeta = {
  kind: 'EVOLUTION'
  sigilo?: boolean
}

type TimelineMeta = LogMeta | EvolutionMeta

type TimelineItem = {
  id: string
  date: Date
  author: { nome: string; cargo?: string } | null
  title: string
  description?: string
  meta: TimelineMeta
}

interface CaseHistoryProps {
  caseId: string
  showOnlyLogs?: boolean
}

export function CaseHistory({ caseId }: CaseHistoryProps) {
  const [showSystem, setShowSystem] = useState(true)
  const [showTechnical, setShowTechnical] = useState(true)
  const [evolutionLimit, setEvolutionLimit] = useState(20)

  // 1. Busca Logs
  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['case-logs', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}`)
      return res.data.logs || []
    },
  })

  // 2. Busca Evoluções
  const { data: evolutionsData, isFetching: fetchingMore } = useQuery({
    queryKey: ['evolutions', caseId, 'timeline', evolutionLimit],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/evolutions`, { 
        params: { pageSize: evolutionLimit } 
      })
      return res.data.items || []
    },
    placeholderData: (previousData) => previousData
  })

  // 3. Unificação
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = []

    if (showSystem && logsData) {
      logsData.forEach((log: CaseLog) => {
        items.push({
          id: `log-${log.id}`,
          date: new Date(log.createdAt),
          author: log.autor,
          title: log.descricao,
          meta: { 
            kind: 'LOG',
            acao: log.acao, 
            changes: parseChanges(log.valorAnterior),
            oldVal: log.valorAnterior,
            newVal: log.valorNovo
          }
        })
      })
    }

    if (showTechnical && evolutionsData) {
      evolutionsData.forEach((evo: Evolution) => {
        items.push({
          id: `evo-${evo.id}`,
          date: new Date(evo.createdAt),
          author: evo.autor,
          title: 'Evolução Técnica Registrada',
          description: evo.conteudo,
          meta: { kind: 'EVOLUTION', sigilo: evo.sigilo }
        })
      })
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [logsData, evolutionsData, showSystem, showTechnical])

  // Agrupamento por Data
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {}
    timelineItems.forEach(item => {
      let key = format(item.date, "yyyy-MM-dd")
      if (isToday(item.date)) key = "Hoje"
      else if (isYesterday(item.date)) key = "Ontem"
      else key = format(item.date, "dd 'de' MMMM, yyyy", { locale: ptBR })
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [timelineItems])

  if (loadingLogs && !logsData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
         <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
         <p className="text-sm uppercase tracking-widest">Carregando histórico...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-lg border shadow-sm text-primary">
             <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Auditoria & Histórico</h3>
            <p className="text-xs text-muted-foreground">Registro cronológico de atividades.</p>
          </div>
        </div>
        
        {/* Filtros Compactos */}
        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border shadow-sm">
          <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 flex items-center gap-1">
             <Filter className="h-3 w-3" /> Exibir:
          </span>
          <Button 
            variant={showSystem ? "secondary" : "ghost"} 
            size="sm" 
            className={cn("h-7 text-xs px-3 rounded-md", showSystem && "bg-primary/10 text-primary hover:bg-primary/20")}
            onClick={() => setShowSystem(!showSystem)}
          >
            Sistema
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button 
            variant={showTechnical ? "secondary" : "ghost"} 
            size="sm" 
            className={cn("h-7 text-xs px-3 rounded-md", showTechnical && "bg-primary/10 text-primary hover:bg-primary/20")}
            onClick={() => setShowTechnical(!showTechnical)}
          >
            Evoluções
          </Button>
        </div>
      </div>

      {/* TIMELINE PRINCIPAL */}
      <div className="relative pl-6 sm:pl-8 space-y-8">
        {/* Linha Vertical Contínua */}
        <div className="absolute left-2.75 sm:left-3.75 top-2 bottom-0 w-px bg-border/60 -z-10" />

        {Object.keys(groupedTimeline).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed border-border/50 gap-3">
            <div className="p-3 bg-muted/50 rounded-full">
               <History className="h-8 w-8 opacity-40"/>
            </div>
            <p className="text-sm font-medium">Nenhum registro encontrado com os filtros atuais.</p>
          </div>
        )}

        {Object.entries(groupedTimeline).map(([dateLabel, items]) => (
          <div key={dateLabel} className="relative group/day">
            
            {/* LABEL DA DATA (Sticky visual) */}
            <div className="flex items-center mb-6">
               <div className="absolute -left-7.5 sm:-left-8.5 w-2.25 h-2.25 bg-primary rounded-full ring-4 ring-background shadow-sm z-10" />
               <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-background px-3 py-1 rounded-full border border-border shadow-sm">
                 {dateLabel}
               </span>
            </div>

            {/* ITENS DO DIA */}
            <div className="space-y-6 pl-2 sm:pl-0">
              {items.map((item) => (
                <TimelineCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* BOTÃO CARREGAR MAIS */}
      {showTechnical && (evolutionsData?.length || 0) >= evolutionLimit && (
        <div className="flex justify-center pt-8 pb-4 relative z-10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEvolutionLimit(prev => prev + 20)}
            disabled={fetchingMore}
            className="text-muted-foreground gap-2 bg-background shadow-sm border-border/60 hover:bg-muted/50"
          >
            {fetchingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <ChevronDown className="h-3.5 w-3.5"/>}
            {fetchingMore ? 'Carregando...' : 'Carregar registros anteriores'}
          </Button>
        </div>
      )}
    </div>
  )
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const isEvo = item.meta.kind === 'EVOLUTION'
  
  // Configuração visual baseada no tipo de evento
  const config = isEvo 
    ? { 
        icon: FileText, 
        color: 'text-status-success-fg', 
        bgIcon: 'bg-status-success-bg border-status-success-border',
        borderColor: 'border-l-status-success-fg'
      }
    : getSystemLogConfig((item.meta as LogMeta).acao)

  const Icon = config.icon

  return (
    <div className="relative group pl-2 transition-all duration-300">
      {/* Ícone na Timeline */}
      <div className={cn(
        "absolute -left-9.75 sm:-left-10.75 top-3.5 w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110 bg-background",
        config.bgIcon
      )}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      <Card className={cn(
        "shadow-sm transition-all hover:shadow-md border-l-[3px] bg-card overflow-hidden", 
        isEvo ? config.borderColor : "border-l-muted-foreground/30"
      )}>
        <CardHeader className="p-3 pb-2 bg-muted/5 border-b border-border/40">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold text-foreground leading-tight truncate max-w-62.5 sm:max-w-md">
                  {item.title}
                </CardTitle>
                {isEvo && (item.meta as EvolutionMeta).sigilo && (
                  <Badge variant="destructive" className="h-4 text-[9px] px-1.5 rounded-sm bg-status-warning-bg text-status-warning-fg border-status-warning-border shadow-none font-bold">
                    SIGILO
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{item.author?.nome || 'Sistema'}</span>
                  <span className="text-border">|</span>
                  <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/30">{format(item.date, "HH:mm")}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-3 text-sm text-foreground/80">
          {isEvo ? (
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
               {item.description}
            </div>
          ) : (
            <LogDetails meta={item.meta as LogMeta} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LogDetails({ meta }: { meta: LogMeta }) {
  if (!meta.changes && !meta.oldVal && !meta.newVal) return null;

  return (
    <div className="text-xs mt-1 bg-muted/30 rounded-lg border border-border/50 p-3">
      {meta.changes ? (
        <div className="grid gap-2">
          {Object.entries(meta.changes).map(([field, diff]: any) => (
            <div key={field} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-1 rounded hover:bg-background/50 transition-colors">
              <span className="font-bold uppercase text-[10px] text-muted-foreground min-w-20 bg-muted/50 px-1 rounded">{field}:</span>
              <div className="flex items-center gap-2 flex-1 font-mono text-[11px]">
                <span className="text-status-error-fg line-through truncate max-w-30 bg-status-error-bg/50 px-1.5 rounded decoration-status-error-fg/50">
                   {String(diff.from || 'Vazio')}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
                <span className="text-status-success-fg font-bold bg-status-success-bg/50 px-1.5 rounded">
                   {String(diff.to || 'Vazio')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 font-mono text-[11px] p-1">
          <span className="line-through text-muted-foreground opacity-70 truncate max-w-37.5">{meta.oldVal}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium text-foreground">{meta.newVal}</span>
        </div>
      )}
    </div>
  )
}

const getSystemLogConfig = (acao: string) => {
  switch (acao) {
    case 'CRIACAO': return { icon: PlusCircle, color: 'text-status-info-fg', bgIcon: 'bg-status-info-bg border-status-info-border', borderColor: 'border-l-status-info-fg' }
    case 'MUDANCA_STATUS': return { icon: RefreshCw, color: 'text-status-warning-fg', bgIcon: 'bg-status-warning-bg border-status-warning-border', borderColor: 'border-l-status-warning-fg' }
    case 'ATRIBUICAO': return { icon: UserPlus, color: 'text-status-ai-fg', bgIcon: 'bg-status-ai-bg border-status-ai-border', borderColor: 'border-l-status-ai-fg' }
    case 'DESLIGAMENTO': return { icon: Power, color: 'text-status-error-fg', bgIcon: 'bg-status-error-bg border-status-error-border', borderColor: 'border-l-status-error-fg' }
    default: return { icon: Briefcase, color: 'text-muted-foreground', bgIcon: 'bg-muted border-border', borderColor: 'border-l-muted-foreground' }
  }
}

const parseChanges = (jsonString?: string | null): LogChanges | undefined => {
  if (!jsonString) return undefined
  try {
    const changes = JSON.parse(jsonString)
    return (typeof changes === 'object' && changes !== null) ? changes : undefined
  } catch { return undefined }
}