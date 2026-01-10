import { Users, UserPlus, Target, BarChart3, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/workspace/SharedComponents'
import { ManagerWorkspaceData } from '@/types/workspace'

export function ManagerWorkspace({ data }: { data: ManagerWorkspaceData }) {
  // Limite de alerta (30 casos)
  const CASELOAD_LIMIT = 30
  // Limite de atenção (70% do limite = 21 casos)
  const CASELOAD_WARNING = CASELOAD_LIMIT * 0.7

  // Função auxiliar para determinar a cor da barra
  const getProgressColor = (count: number) => {
    if (count > CASELOAD_LIMIT) return 'bg-red-500 dark:bg-red-600'
    if (count > CASELOAD_WARNING) return 'bg-amber-500 dark:bg-amber-600'
    return 'bg-emerald-500 dark:bg-emerald-600'
  }

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

        {/* 3. Top Demandas (Rankings) */}
        <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-destructive"/> Top Demandas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
               {data.topViolations?.length === 0 ? (
                 <p className="text-sm text-muted-foreground py-4 text-center">Sem dados suficientes no período.</p>
               ) : (
                 data.topViolations?.map((v, idx) => (
                   <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30 hover:bg-muted transition-colors group">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {v.label || 'Não informado'}
                      </span>
                      <Badge variant="secondary" className="bg-background border shadow-sm font-bold text-muted-foreground tabular-nums">
                        {v.count}
                      </Badge>
                   </div>
                 ))
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}