// frontend/src/components/workspace/SharedComponents.tsx
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowRight, Eye, FileText } from 'lucide-react' // [CORREÇÃO] Removido AlertTriangle
import { cn } from '@/lib/utils'
import { ROUTE_PATHS } from '@/constants/app-routes'

// [INTEGRAÇÃO] Importando seu sistema de constantes
import { getUrgencyColor } from '@/constants/cases/styles'
import { URGENCIA_NIVEIS } from '@/constants/cases/definitions'
import { BaseCase } from '@/types/workspace'

// --- HELPER DE BORDAS LATERAIS ---
export const getUrgencyBorderColor = (urgency: string | null | undefined) => {
  const term = urgency?.trim() || ''
  
  if (URGENCIA_NIVEIS.GRAVISSIMA.includes(term)) return 'border-l-red-600 dark:border-l-red-500'
  if (URGENCIA_NIVEIS.MUITO_GRAVE.includes(term)) return 'border-l-orange-500 dark:border-l-orange-400'
  if (URGENCIA_NIVEIS.GRAVE.includes(term)) return 'border-l-amber-500 dark:border-l-amber-400' 
  if (URGENCIA_NIVEIS.LEVE.includes(term)) return 'border-l-emerald-500 dark:border-l-emerald-400'

  return 'border-l-slate-300 dark:border-l-slate-700'
}

// --- HELPER DE VIOLAÇÕES ---
const ViolationTags = ({ data }: { data: string | string[] | undefined | null }) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <span className="text-xs text-muted-foreground/60 italic">Nenhuma violação registrada</span>
  }

  const tags = Array.isArray(data) 
    ? data 
    : data.toString().split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tags.slice(0, 3).map((tag, idx) => (
        <Badge 
          key={idx} 
          variant="secondary" 
          className="text-[10px] font-medium h-5 px-2 bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap"
        >
          {tag}
        </Badge>
      ))}
      {tags.length > 3 && (
        <span className="text-[10px] text-muted-foreground self-center">+{tags.length - 3}</span>
      )}
    </div>
  )
}

// --- KPI CARD ---
export const KPICard = ({ title, value, subtitle, icon: Icon, theme, onClick }: any) => {
  const themes: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400",
    emerald: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400",
    purple: "border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400",
    orange: "border-orange-500 bg-orange-50/50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400",
    slate: "border-slate-500 bg-slate-50/50 dark:bg-slate-900/10 text-slate-700 dark:text-slate-400",
  }
  
  const activeStyle = themes[theme] || themes.slate

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all duration-200 relative group",
        "border-y border-r border-border/50",
        activeStyle,
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      )}
    >
      <CardContent className="p-5 flex justify-between items-start relative z-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {subtitle && <p className="text-xs opacity-80 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm">
           <Icon className="w-5 h-5 opacity-90" />
        </div>
      </CardContent>
      {onClick && <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 opacity-0 group-hover:opacity-50 transition-all -translate-x-2 group-hover:translate-x-0" />}
    </Card>
  )
}

// --- TABELA DE CASOS ---
export const CaseListTable = ({ cases, emptyMessage, isEspecialista }: { cases: BaseCase[], emptyMessage: string, isEspecialista: boolean }) => {
  const navigate = useNavigate()

  if (!cases || cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-muted-foreground border-dashed border-2 rounded-xl bg-muted/5 mx-6 my-4 dark:border-slate-800">
        <div className="bg-muted p-3 rounded-full mb-3 opacity-50">
           <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">{emptyMessage}</p>
        {!isEspecialista && (
           <Button variant="link" size="sm" onClick={() => navigate(ROUTE_PATHS.WAITING_LIST)} className="mt-1">
             Verificar Fila Pessoal
           </Button>
        )}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="space-y-3 pb-4">
        {cases.map((c) => {
          const borderColor = getUrgencyBorderColor(c.urgencia)
          const badgeColorClass = getUrgencyColor(c.urgencia)

          return (
            <div 
              key={c.id} 
              onClick={() => navigate(`/app/cases/${c.id}`)}
              className={cn(
                "group relative grid grid-cols-1 md:grid-cols-12 gap-4 rounded-lg bg-card shadow-sm border border-transparent",
                "p-4 pl-5", 
                "hover:border-primary/20 hover:shadow-md transition-all items-center cursor-pointer",
                // [CORREÇÃO TAILWIND] border-l-[4px] -> border-l-4
                "border-l-4", 
                borderColor
              )}
            >
              {/* 1. NOME E STATUS (5/12) */}
              <div className="md:col-span-5 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                   <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors" title={c.nomeCompleto}>
                     {c.nomeCompleto}
                   </p>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200">
                     {c.status?.replace(/_/g, ' ') || 'STATUS'}
                   </Badge>
                </div>
              </div>

              {/* 2. URGÊNCIA E VIOLAÇÕES (4/12) */}
              <div className="md:col-span-4 flex flex-col gap-1.5 min-w-0 border-t md:border-t-0 md:border-l border-dashed border-border/60 pt-3 md:pt-0 md:pl-4 mt-1 md:mt-0">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Prioridade:</span>
                     <Badge variant="outline" className={cn("text-[10px] h-5 px-2 shadow-none border font-semibold", badgeColorClass)}>
                        {c.urgencia || 'NORMAL'}
                     </Badge>
                  </div>
                  <div className="flex flex-col">
                     <ViolationTags data={c.violacao} />
                  </div>
              </div>

              {/* 3. AÇÕES (3/12) */}
              <div className="md:col-span-3 flex justify-end items-center gap-2 mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                <Button 
                  size="sm" 
                  className="h-8 text-[11px] px-3 font-medium bg-background hover:bg-primary hover:text-white border hover:border-primary text-foreground transition-all shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/app/cases/${c.id}?tab=paf`)
                  }}
                >
                  {isEspecialista ? 'Gerir PAF' : 'Acolher'}
                </Button>

                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 hover:bg-muted transition-colors rounded-full" 
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/app/cases/${c.id}`)
                  }}
                >
                  <Eye className="h-4 w-4 text-muted-foreground"/>
                </Button>
              </div>

            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}