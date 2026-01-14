// frontend/src/components/case/tabs/HistoryTab.tsx
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format, isToday, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  PlusCircle, RefreshCw, UserPlus, Power, FileText, 
  ArrowRight, Loader2, ShieldCheck, Briefcase, ChevronDown, Filter
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-lg border shadow-sm">
             <ShieldCheck className="h-5 w-5 text-primary" />
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
            className="h-7 text-xs px-3"
            onClick={() => setShowSystem(!showSystem)}
          >
            Sistema
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button 
            variant={showTechnical ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 text-xs px-3"
            onClick={() => setShowTechnical(!showTechnical)}
          >
            Evoluções
          </Button>
        </div>
      </div>

      {/* TIMELINE PRINCIPAL */}
      <div className="relative pl-6 sm:pl-8 space-y-8">
        {/* Linha Vertical Contínua */}
        <div className="absolute left-[11px] sm:left-[15px] top-2 bottom-0 w-px bg-border -z-10" />

        {Object.keys(groupedTimeline).length === 0 && (
          <div className="text-center py-12 text-muted-foreground italic bg-muted/5 rounded-lg border-2 border-dashed">
            Nenhum registro encontrado com os filtros atuais.
          </div>
        )}

        {Object.entries(groupedTimeline).map(([dateLabel, items]) => (
          <div key={dateLabel} className="relative">
            
            {/* LABEL DA DATA (Sticky visual) */}
            <div className="flex items-center mb-6">
               <div className="absolute -left-[30px] sm:-left-[34px] w-[9px] h-[9px] bg-primary rounded-full ring-4 ring-background" />
               <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 px-3 py-1 rounded-full border border-muted/50">
                 {dateLabel}
               </span>
            </div>

            {/* ITENS DO DIA */}
            <div className="space-y-6">
              {items.map((item) => (
                <TimelineCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* BOTÃO CARREGAR MAIS */}
      {showTechnical && (evolutionsData?.length || 0) >= evolutionLimit && (
        <div className="flex justify-center pt-4 pb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEvolutionLimit(prev => prev + 20)}
            disabled={fetchingMore}
            className="text-muted-foreground gap-2"
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
        color: 'text-emerald-600 dark:text-emerald-400', 
        bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30',
        borderColor: 'border-l-emerald-500'
      }
    : getSystemLogConfig((item.meta as LogMeta).acao)

  const Icon = config.icon

  return (
    <div className="relative group pl-2">
      {/* Ícone na Timeline */}
      <div className={cn(
        "absolute -left-[39px] sm:-left-[43px] top-3 w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110",
        config.bgIcon
      )}>
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      <Card className={cn(
        "shadow-sm transition-all hover:shadow-md border-l-[3px]", 
        isEvo ? config.borderColor : "border-l-muted"
      )}>
        <CardHeader className="p-3 pb-2 bg-muted/5 border-b border-border/40">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                  {item.title}
                </CardTitle>
                {isEvo && (item.meta as EvolutionMeta).sigilo && (
                  <Badge variant="destructive" className="h-4 text-[9px] px-1.5 rounded-sm">SIGILO</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                 <span className="font-medium text-foreground/80">{item.author?.nome || 'Sistema'}</span>
                 <span>•</span>
                 <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{format(item.date, "HH:mm")}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-3 text-sm text-foreground/80">
          {isEvo ? (
            <div className="prose prose-sm max-w-none text-muted-foreground">
               <p className="whitespace-pre-wrap leading-relaxed">{item.description}</p>
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
    <div className="text-xs mt-1 bg-muted/30 rounded-md border border-muted/60 p-2.5">
      {meta.changes ? (
        <div className="grid gap-2">
          {Object.entries(meta.changes).map(([field, diff]: any) => (
            <div key={field} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-bold uppercase text-[10px] text-muted-foreground min-w-[80px]">{field}:</span>
              <div className="flex items-center gap-2 flex-1 font-mono">
                <span className="text-red-500/80 line-through truncate max-w-[120px] bg-red-50 px-1 rounded">
                   {String(diff.from || 'Vazio')}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
                <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                   {String(diff.to || 'Vazio')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 font-mono">
          <span className="line-through text-muted-foreground opacity-70">{meta.oldVal}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{meta.newVal}</span>
        </div>
      )}
    </div>
  )
}

const getSystemLogConfig = (acao: string) => {
  switch (acao) {
    case 'CRIACAO': return { icon: PlusCircle, color: 'text-blue-600', bgIcon: 'bg-blue-100', borderColor: 'border-l-blue-500' }
    case 'MUDANCA_STATUS': return { icon: RefreshCw, color: 'text-amber-600', bgIcon: 'bg-amber-100', borderColor: 'border-l-amber-500' }
    case 'ATRIBUICAO': return { icon: UserPlus, color: 'text-purple-600', bgIcon: 'bg-purple-100', borderColor: 'border-l-purple-500' }
    case 'DESLIGAMENTO': return { icon: Power, color: 'text-red-600', bgIcon: 'bg-red-100', borderColor: 'border-l-red-500' }
    default: return { icon: Briefcase, color: 'text-slate-600', bgIcon: 'bg-slate-100', borderColor: 'border-l-slate-400' }
  }
}

const parseChanges = (jsonString?: string | null): LogChanges | undefined => {
  if (!jsonString) return undefined
  try {
    const changes = JSON.parse(jsonString)
    return (typeof changes === 'object' && changes !== null) ? changes : undefined
  } catch { return undefined }
}