import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format, isToday, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  PlusCircle, RefreshCw, UserPlus, Power, FileText, 
  ArrowRight, Loader2, ShieldCheck, MessageSquare, Briefcase, ChevronDown
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { CaseLog, Evolution } from '@/types/case'

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

  // 2. Busca Evoluções (loadingEvos removido pois não era usado)
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

  // Agrupamento
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
    <div className="space-y-6">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Prontuário Unificado</h3>
            <p className="text-xs text-muted-foreground">Visão cronológica completa do caso.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="filter-sys" checked={showSystem} onCheckedChange={setShowSystem} />
            <Label htmlFor="filter-sys" className="text-xs cursor-pointer flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Sistema
            </Label>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Switch id="filter-tec" checked={showTechnical} onCheckedChange={setShowTechnical} />
            <Label htmlFor="filter-tec" className="text-xs cursor-pointer flex items-center gap-1">
              <FileText className="h-3 w-3" /> Evoluções
            </Label>
          </div>
        </div>
      </div>

      {/* TIMELINE ALINHADA À ESQUERDA (Full Width) */}
      <div className="relative ml-4 space-y-8 border-l-2 border-muted/60 pl-8 pb-4">
        
        {Object.keys(groupedTimeline).length === 0 && (
          <div className="text-center py-8 text-muted-foreground italic -ml-8">
            Nenhum registro encontrado com os filtros atuais.
          </div>
        )}

        {Object.entries(groupedTimeline).map(([dateLabel, items]) => (
          <div key={dateLabel} className="relative">
            
            {/* DATA (STICKY LABEL) */}
            <div className="absolute -left-[45px] top-0 flex items-center">
               {/* Ponto na linha */}
               <div className="w-3 h-3 bg-muted-foreground/30 rounded-full ring-4 ring-background" />
            </div>
            
            <div className="mb-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background px-2 py-1 rounded border shadow-sm">
                {dateLabel}
              </span>
            </div>

            {/* ITENS DO DIA */}
            <div className="space-y-4">
              {items.map((item) => (
                <TimelineCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* BOTÃO CARREGAR MAIS */}
      {showTechnical && (
        <div className="flex justify-center pt-2 pb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEvolutionLimit(prev => prev + 20)}
            disabled={fetchingMore || (evolutionsData?.length || 0) < evolutionLimit}
            className="text-muted-foreground"
          >
            {fetchingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ChevronDown className="mr-2 h-4 w-4"/>}
            {fetchingMore ? 'Carregando histórico...' : 'Carregar mais antigos'}
          </Button>
        </div>
      )}
    </div>
  )
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const isEvo = item.meta.kind === 'EVOLUTION'
  
  const config = isEvo 
    ? { 
        icon: FileText, 
        color: 'text-emerald-600 dark:text-emerald-400', 
        bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800'
      }
    : getSystemLogConfig((item.meta as LogMeta).acao)

  const Icon = config.icon

  return (
    <div className="relative group">
      <div className={`absolute -left-[43px] top-4 w-8 h-8 rounded-full border-2 border-background flex items-center justify-center shadow-sm z-10 ${config.bgIcon}`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      </div>

      <Card className={`shadow-sm transition-all hover:shadow-md w-full ${isEvo ? 'border-l-4 border-l-emerald-500' : ''}`}>
        <CardHeader className="p-3 pb-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                {item.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {format(item.date, "HH:mm")}
                </span>
                {isEvo && (item.meta as EvolutionMeta).sigilo && (
                  <Badge variant="destructive" className="h-4 text-[9px] px-1">SIGILO</Badge>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                   • <span className="font-medium">{item.author?.nome || 'Sistema'}</span>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-2 text-sm text-muted-foreground">
          {isEvo ? (
            <p className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
              {item.description}
            </p>
          ) : (
            <LogDetails meta={item.meta as LogMeta} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LogDetails({ meta }: { meta: LogMeta }) {
  return (
    <div className="text-xs space-y-2 mt-1">
      {meta.changes && (
        <div className="bg-muted/30 rounded p-2 grid gap-1 border">
          {Object.entries(meta.changes).map(([field, diff]: any) => (
            <div key={field} className="grid grid-cols-[auto_1fr] gap-2 items-center">
              <span className="font-semibold capitalize text-foreground/80">{field}:</span>
              <div className="flex items-center gap-1 truncate">
                <span className="text-red-500 line-through opacity-70">{String(diff.from || 'Vazio')}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-emerald-600 font-medium">{String(diff.to || 'Vazio')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!meta.changes && meta.oldVal && meta.newVal && (
          <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded w-fit">
            <span className="line-through opacity-70">{meta.oldVal}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{meta.newVal}</span>
          </div>
      )}
    </div>
  )
}

const getSystemLogConfig = (acao: string) => {
  switch (acao) {
    case 'CRIACAO': return { icon: PlusCircle, color: 'text-blue-600', bgIcon: 'bg-blue-100 dark:bg-blue-900/30' }
    case 'MUDANCA_STATUS': return { icon: RefreshCw, color: 'text-amber-600', bgIcon: 'bg-amber-100 dark:bg-amber-900/30' }
    case 'ATRIBUICAO': return { icon: UserPlus, color: 'text-purple-600', bgIcon: 'bg-purple-100 dark:bg-purple-900/30' }
    case 'DESLIGAMENTO': return { icon: Power, color: 'text-red-600', bgIcon: 'bg-red-100 dark:bg-red-900/30' }
    case 'EVOLUCAO_CRIADA': return { icon: MessageSquare, color: 'text-emerald-600', bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30' }
    default: return { icon: Briefcase, color: 'text-slate-600', bgIcon: 'bg-slate-100 dark:bg-slate-800' }
  }
}

const parseChanges = (jsonString?: string | null): LogChanges | undefined => {
  if (!jsonString) return undefined
  try {
    const changes = JSON.parse(jsonString)
    return (typeof changes === 'object' && changes !== null) ? changes : undefined
  } catch { return undefined }
}