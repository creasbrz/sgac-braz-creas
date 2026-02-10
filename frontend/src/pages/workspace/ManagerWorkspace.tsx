// frontend/src/pages/workspace/ManagerWorkspace.tsx
import { useMemo } from 'react'
import { 
  Users, UserPlus, Target, BarChart3, ShieldAlert, AlertTriangle, 
  Info, UserCog, User, Trophy, Medal 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/workspace/SharedComponents'
import { ManagerWorkspaceData } from '@/types/workspace'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function ManagerWorkspace({ data }: { data: ManagerWorkspaceData }) {
  
  // --- CONFIGURAÇÃO ---
  const CONFIG = {
    CASELOAD_LIMIT: 25, 
    WARNING_THRESHOLD: 17.5,
  }

  // --- HELPERS VISUAIS ---
  const getLoadColor = (count: number) => {
    if (count >= CONFIG.CASELOAD_LIMIT) return 'bg-status-error-fg' 
    if (count >= CONFIG.WARNING_THRESHOLD) return 'bg-status-warning-fg' 
    return 'bg-status-success-fg' 
  }

  const getLoadPercentage = (count: number) => {
    return Math.min((count / (CONFIG.CASELOAD_LIMIT * 1.2)) * 100, 100)
  }

  // Helper para cores do Ranking
  const getRankingStyle = (index: number) => {
    switch (index) {
      case 0: return { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20', icon: Trophy } // Ouro
      case 1: return { color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', icon: Medal } // Prata
      case 2: return { color: 'text-amber-700', bg: 'bg-orange-100 dark:bg-orange-900/20', icon: Medal } // Bronze
      default: return { color: 'text-muted-foreground', bg: 'bg-muted/40', icon: null }
    }
  }

  // --- PROCESSAMENTO DE DADOS ---
  const { specialists, agents } = useMemo(() => {
    const normalizedMembers = (data.teamLoad as unknown as any[]).map(m => ({
      id: m.id,
      role: m.role,
      displayName: m.name || m.nome || 'Servidor sem nome', 
      resolvedValue: m.value ?? m.cases ?? m.count ?? 0
    }));

    normalizedMembers.sort((a, b) => b.resolvedValue - a.resolvedValue);

    return {
      specialists: normalizedMembers.filter(m => m.role === 'Especialista'),
      agents: normalizedMembers.filter(m => m.role !== 'Especialista')
    }
  }, [data.teamLoad]);

  // Componente de Lista de Membros (Compactado)
  const RenderMemberList = ({ title, members, icon: Icon }: { title: string, members: any[], icon: any }) => (
    <div className="space-y-3"> {/* [Compactado] space-y-4 -> space-y-3 */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        {title}
      </h4>
      
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground italic pl-6">Nenhum servidor neste grupo.</p>
      ) : (
        members.map((member, idx) => (
          <div key={`${member.id}-${idx}`} className="group">
            <div className="flex justify-between items-end mb-1"> {/* [Compactado] mb-1.5 -> mb-1 */}
              <span className="font-semibold text-sm text-foreground truncate max-w-45" title={member.displayName}>
                {member.displayName}
              </span>
              <div className="text-right whitespace-nowrap">
                <span className="text-sm font-bold tabular-nums text-foreground">{member.resolvedValue}</span>
                <span className="text-[10px] text-muted-foreground ml-1">/ {CONFIG.CASELOAD_LIMIT}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden ring-1 ring-border/30">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${getLoadColor(member.resolvedValue)}`} 
                  style={{ width: `${getLoadPercentage(member.resolvedValue)}%` }} 
                />
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      
      {/* 1. KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <KPICard 
            title="Total de Casos Ativos" 
            value={data.stats.totalActive} 
            subtitle="Famílias em acompanhamento"
            icon={Users}
            theme="blue"
          />
        </div>
        <KPICard 
          title="Porta de Entrada" 
          value={data.stats.waitingForReception} 
          subtitle="Aguardando Acolhida Inicial"
          icon={UserPlus}
          theme="amber"
        />
        <KPICard 
          title="Para Distribuir" 
          value={data.stats.waitingForDistribution} 
          subtitle="Aguardando Especialista."
          icon={Target}
          theme="purple"
        />
      </section>

      {/* 2. PAINEL DE GESTÃO (Removida altura fixa h-[550px]) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* CARD: CARGA DA EQUIPE */}
        <Card className="shadow-sm border-border/60 flex flex-col bg-background h-full">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <div className="p-2 rounded-lg bg-status-info-bg border border-status-info-border">
                   <BarChart3 className="h-4 w-4 text-status-info-fg"/> 
                </div>
                Carga da Equipe
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Meta ideal: até {CONFIG.CASELOAD_LIMIT} casos por técnico.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>Distribuição de casos por técnico e função.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-5"> {/* [Compactado] p-6 -> p-5 */}
            <div className="space-y-6"> {/* [Compactado] space-y-8 -> space-y-6 */}
              <RenderMemberList title="Especialistas" members={specialists} icon={UserCog} />
              <Separator className="bg-border/60" />
              <RenderMemberList title="Agentes Sociais" members={agents} icon={User} />
            </div>
          </CardContent>
        </Card>

        {/* CARD: VIOLAÇÕES (Top 10 Completo) */}
        <Card className="shadow-sm border-border/60 flex flex-col bg-background h-full">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5 shrink-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-2 rounded-lg bg-status-error-bg border border-status-error-border">
                 <ShieldAlert className="h-4 w-4 text-status-error-fg"/> 
              </div>
              Ranking de Violações (Top 10)
            </CardTitle>
            <CardDescription>Tipologias mais frequentes no período.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-5"> {/* [Compactado] p-6 -> p-5 */}
               {(!data.topViolations || data.topViolations.length === 0) ? (
                 <div className="flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-60 py-12">
                    <div className="bg-muted p-4 rounded-full">
                       <AlertTriangle className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">Nenhuma violação tipificada.</p>
                 </div>
               ) : (
                 <div className="space-y-3"> {/* [Compactado] space-y-4 -> space-y-3 */}
                   {data.topViolations.map((v, idx) => {
                     const maxVal = Math.max(...(data.topViolations?.map(t => t.count) || [1]), 1);
                     const percent = (v.count / maxVal) * 100
                     const style = getRankingStyle(idx)
                     const RankIcon = style.icon

                     return (
                       <div key={idx} className="group relative">
                          <div className="flex items-center gap-3 mb-1.5"> {/* [Compactado] mb-2 -> mb-1.5 */}
                             {/* Badge de Posição */}
                             <div className={cn(
                               "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0", // [Compactado] w-6 -> w-5
                               style.bg,
                               style.color
                             )}>
                               {idx + 1}º
                             </div>

                             {/* Nome da Violação */}
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-foreground truncate pr-2" title={v.label}>
                                    {v.label || 'Não informado'}
                                  </span>
                                  {RankIcon && idx < 3 && (
                                    <RankIcon className={cn("h-3 w-3 mr-2 opacity-80", style.color)} />
                                  )}
                               </div>
                             </div>

                             {/* Contagem */}
                             <Badge variant="outline" className="tabular-nums font-bold h-5 px-1.5 text-[10px] bg-background">
                               {v.count}
                             </Badge>
                          </div>
                          
                          {/* Barra de Progresso */}
                          <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden ml-8 w-[calc(100%-2rem)]">
                             <div 
                               className={cn(
                                 "h-full rounded-full transition-all duration-700 ease-out",
                                 idx < 3 ? "bg-primary/80" : "bg-muted-foreground/40"
                               )}
                               style={{ width: `${percent}%` }} 
                             />
                          </div>
                       </div>
                     )
                   })}
                 </div>
               )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}