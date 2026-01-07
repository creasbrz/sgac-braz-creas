import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowRight, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getUrgencyColor } from '@/constants/caseConstants'
import { BaseCase } from '@/types/workspace'

import { 
  URGENCIA_GRAVISSIMA, 
  URGENCIA_MUITO_GRAVE, 
  URGENCIA_GRAVE, 
  URGENCIA_LEVE 
} from '@/constants/caseConstants'

// --- HELPER DE BORDAS COLORIDAS ---
export const getUrgencyBorderColor = (urgency: string | null | undefined) => {
  const term = urgency?.toUpperCase().trim() || ''
  const check = (list: readonly string[]) => list.some(k => term === k || term.includes(k))

  if (check(URGENCIA_GRAVISSIMA)) return 'border-l-red-500'
  if (check(URGENCIA_MUITO_GRAVE)) return 'border-l-orange-500'
  if (check(URGENCIA_GRAVE)) return 'border-l-yellow-500' // Amarelo
  if (check(URGENCIA_LEVE)) return 'border-l-emerald-500' // Verde

  return 'border-l-slate-300 dark:border-l-slate-700'
}

// --- KPI CARD ---
export const KPICard = ({ title, value, subtitle, icon: Icon, theme, onClick }: any) => {
  const themes: any = {
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    emerald: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    purple: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
    orange: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
  }
  
  const activeStyle = themes[theme] || themes.blue

  return (
    <Card 
      onClick={onClick}
      className={`overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all ${activeStyle} border-y border-r border-border/50 relative ${onClick ? 'cursor-pointer group' : ''}`}
    >
      <CardContent className="p-5 flex justify-between items-start relative z-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">{title}</p>
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {subtitle && <p className="text-xs opacity-90 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-full bg-white/50 dark:bg-black/20">
           <Icon className="w-6 h-6" />
        </div>
      </CardContent>
      {onClick && <ArrowRight className="absolute bottom-2 right-2 h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />}
    </Card>
  )
}

// --- LISTA DE CASOS PADRÃO ---
export const CaseListTable = ({ cases, emptyMessage, isEspecialista }: { cases: BaseCase[], emptyMessage: string, isEspecialista: boolean }) => {
  const navigate = useNavigate()

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-dashed border-2 rounded-xl bg-muted/5 m-2 dark:border-slate-800">
        <p className="text-sm font-medium">{emptyMessage}</p>
        {!isEspecialista && (
           <Button variant="link" size="sm" onClick={() => navigate(ROUTES.WAITING_LIST)}>
             Verificar Fila Pessoal
           </Button>
        )}
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px]">
      <div className="space-y-2 pr-4 pb-2">
        {cases.map((c) => (
          <div 
            key={c.id} 
            className={`
              relative grid grid-cols-12 gap-3 p-3 rounded-lg bg-card shadow-sm border border-transparent 
              hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md transition-all items-center group
              border-l-[4px] ${getUrgencyBorderColor(c.urgencia)}
            `}
          >
            {/* COLUNA 1: Nome e Status */}
            <div className="col-span-5 flex flex-col gap-0.5">
              <p className="font-semibold text-sm truncate text-foreground/90">{c.nomeCompleto}</p>
              <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    {c.status.replace(/_/g, ' ')}
                  </span>
              </div>
            </div>

            {/* COLUNA 2: Violação e Urgência */}
            <div className="col-span-4 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground truncate" title={c.violacao || ''}>
                  {c.violacao || 'Violação não inf.'}
                </span>
                <div className="flex">
                  {/* [CORREÇÃO] Use variant="outline" para que a cor de fundo funcione */}
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-2 h-5 border shadow-none ${getUrgencyColor(c.urgencia)}`}
                  >
                    {c.urgencia || 'NORMAL'}
                  </Badge>
                </div>
            </div>

            {/* COLUNA 3: Ações */}
            <div className="col-span-3 flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted" onClick={() => navigate(`${ROUTES.CASES}/${c.id}`)}>
                <Eye className="h-4 w-4 text-muted-foreground hover:text-primary"/>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-[10px] px-2 hidden sm:flex bg-transparent border-slate-200 dark:border-slate-700" onClick={() => navigate(`${ROUTES.CASES}/${c.id}?tab=paf`)}>
                {isEspecialista ? 'PAF' : 'Acolher'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}