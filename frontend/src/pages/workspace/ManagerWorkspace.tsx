import { Users, UserPlus, Target, BarChart3, ShieldAlert, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/workspace/SharedComponents'
import { ManagerWorkspaceData } from '@/types/workspace'

export function ManagerWorkspace({ data }: { data: ManagerWorkspaceData }) {
  // Limite de alerta (30 casos)
  const CASELOAD_LIMIT = 30
  // Limite de atenção (70% do limite = 21 casos)
  const CASELOAD_WARNING = CASELOAD_LIMIT * 0.7

  // Função auxiliar para determinar a cor da barra de carga
  const getProgressColor = (count: number) => {
    if (count > CASELOAD_LIMIT) return 'bg-red-500 dark:bg-red-600'
    if (count > CASELOAD_WARNING) return 'bg-amber-500 dark:bg-amber-600'
    return 'bg-emerald-500 dark:bg-emerald-600'
  }

  // Encontrar o maior valor de violação para calcular a barra relativa (Ranking)
  const maxViolationCount = Math.max(...(data.topViolations?.map(v => v.count) || [0]), 1)

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. KPIs Estratégicos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2">
          <KPICard 
            title="Total Ativos" 
            value={data.stats.totalActive} 
            subtitle="Em acompanhamento na unidade"
            icon={Users}
            theme="blue"
          />
        </div>
        <KPICard 
          title="Porta de Entrada" 
          value={data.stats.waitingForReception} 
          subtitle="Aguardando Acolhida"
          icon={UserPlus}
          theme="amber"
        />
        <KPICard 
          title="Para Distribuir" 
          value={data.stats.waitingForDistribution} 
          subtitle="Aguardando Especialista"
          icon={Target}
          theme="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 2. Carga da Equipe (Com Semáforo) */}
        <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary"/> Carga da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.teamLoad.map((member, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{member.nome}</span>
                    <div className="flex items-center gap-2">
                      {/* Badge com Acessibilidade Melhorada */}
                      <Badge 
                        variant="outline" 
                        className="text-[10px] font-normal text-muted-foreground border-border cursor-help"
                        title={member.role === 'Especialista' ? 'Técnico de Referência (ACOMPANHAMENTO)' : 'Agente de Acolhida e Triagem'}
                        aria-label={`Função: ${member.role}`}
                      >
                        {member.role === 'Especialista' ? 'ACOMPANHAMENTO' : 'ACOLHIDA'}
                      </Badge>
                      <span className="text-foreground font-bold tabular-nums">
                        {member.cases} <span className="text-[10px] font-normal text-muted-foreground">casos</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso com Estado Intermediário (Amarelo) */}
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full transition-all duration-500 ${getProgressColor(member.cases)}`} 
                       style={{ width: `${Math.min((member.cases / (CASELOAD_LIMIT * 1.2)) * 100, 100)}%` }} 
                     />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Principais Demandas (Estilo Padronizado) */}
        <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-destructive"/> Principais Demandas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
               {data.topViolations?.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <AlertTriangle className="h-8 w-8 opacity-20" />
                    <p className="text-sm">Sem violações registradas no período.</p>
                 </div>
               ) : (
                 data.topViolations?.map((v, idx) => {
                   // Calcula percentual relativo ao maior item para a barra
                   const percent = (v.count / maxViolationCount) * 100
                   
                   return (
                     <div key={idx} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                           <div className="flex items-center gap-2">
                              {/* Badge estilizado conforme ViolationTags em SharedComponents */}
                              <Badge 
                                variant="secondary" 
                                className="text-[11px] font-medium h-6 px-2.5 bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap"
                              >
                                {v.label || 'Não informado'}
                              </Badge>
                           </div>
                           <span className="text-xs font-bold text-foreground tabular-nums">
                             {v.count}
                           </span>
                        </div>
                        {/* Barra de Frequência (Cinza/Slate para neutralidade) */}
                        <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-500"
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