// frontend/src/pages/workspace/ManagerWorkspace.tsx
import { useMemo } from 'react'
import { Users, UserPlus, Target, BarChart3, ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/workspace/SharedComponents'
import { ManagerWorkspaceData } from '@/types/workspace'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Extensão da tipagem para garantir compatibilidade se a API mudar
interface TeamMemberLoad {
  name: string
  role: string
  value: number // [CORREÇÃO] A API retorna 'value', não 'cases'
}

export function ManagerWorkspace({ data }: { data: ManagerWorkspaceData }) {
  
  // --- CONFIGURAÇÃO DE LIMITES ---
  const CONFIG = {
    CASELOAD_LIMIT: 25, // Teto ideal de casos por técnico
    WARNING_THRESHOLD: 17.5, // 70% do limite (Alerta começa acima de 17 casos)
  }

  // --- HELPERS ---
  
  // Determina a cor da barra baseada na carga usando tokens semânticos
  const getLoadColor = (count: number) => {
    if (count >= CONFIG.CASELOAD_LIMIT) return 'bg-status-error-fg' // Vermelho
    if (count >= CONFIG.WARNING_THRESHOLD) return 'bg-status-warning-fg' // Laranja
    return 'bg-status-success-fg' // Verde
  }

  // Calcula a largura da barra (Escala de 120% para acomodar overflow visualmente)
  const getLoadPercentage = (count: number) => {
    return Math.min((count / (CONFIG.CASELOAD_LIMIT * 1.2)) * 100, 100)
  }

  // Memo para cálculo do ranking de violações (evita recálculo desnecessário)
  const maxViolationCount = useMemo(() => {
    return Math.max(...(data.topViolations?.map(v => v.count) || [0]), 1)
  }, [data.topViolations])

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      
      {/* 1. KPIs ESTRATÉGICOS */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <KPICard 
            title="Total de Casos Ativos" 
            value={data.stats.totalActive} 
            subtitle="Famílias em acompanhamento PAEFI"
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

      {/* 2. PAINEL DE GESTÃO E DIAGNÓSTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD: CARGA DA EQUIPE */}
        <Card className="shadow-sm border-border/60 flex flex-col h-full bg-background">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/5">
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
            <CardDescription>Distribuição de casos por técnico de referência.</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-6">
            <div className="space-y-6">
              {/* [CORREÇÃO] Casting para garantir tipagem correta durante o map */}
              {(data.teamLoad as unknown as TeamMemberLoad[]).map((member, idx) => (
                <div key={idx} className="group">
                  {/* Header do Item */}
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-sm text-foreground">{member.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] h-5 px-2 font-medium text-muted-foreground border-border bg-muted/50"
                        >
                          {member.role === 'Especialista' ? 'Especialista' : 'Acolhida'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {member.value} {/* [CORREÇÃO] Usando .value ao invés de .cases */}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">/ {CONFIG.CASELOAD_LIMIT}</span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso Customizada */}
                  <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden ring-1 ring-border/30">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${getLoadColor(member.value)}`} 
                        style={{ width: `${getLoadPercentage(member.value)}%` }} 
                        role="progressbar"
                        aria-valuenow={member.value}
                        aria-valuemin={0}
                        aria-valuemax={CONFIG.CASELOAD_LIMIT}
                      />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CARD: PRINCIPAIS DEMANDAS (VIOLAÇÕES) */}
        <Card className="shadow-sm border-border/60 flex flex-col h-full bg-background">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/5">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-2 rounded-lg bg-status-error-bg border border-status-error-border">
                 <ShieldAlert className="h-4 w-4 text-status-error-fg"/> 
              </div>
              Ranking de Violações
            </CardTitle>
            <CardDescription>Tipologias mais frequentes no período.</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-6">
            <div className="space-y-5">
               {(!data.topViolations || data.topViolations.length === 0) ? (
                 <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground gap-3 opacity-60">
                    <div className="bg-muted p-4 rounded-full">
                       <AlertTriangle className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">Nenhuma violação tipificada.</p>
                 </div>
               ) : (
                 data.topViolations.map((v, idx) => {
                   const percent = (v.count / maxViolationCount) * 100
                   
                   return (
                     <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                           <span className="font-medium text-foreground truncate pr-4 max-w-50" title={v.label}>
                             {v.label || 'Não informado'}
                           </span>
                           <span className="font-bold text-foreground tabular-nums bg-muted px-1.5 rounded text-[10px]">
                             {v.count}
                           </span>
                        </div>
                        
                        {/* Barra Relativa (Visual de Ranking) */}
                        <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-foreground/70 dark:bg-foreground/50 rounded-full transition-all duration-700 ease-out group-hover:bg-primary/90"
                             style={{ width: `${percent}%` }} 
                           />
                        </div>
                     </div>
                   )
                 })
               )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}