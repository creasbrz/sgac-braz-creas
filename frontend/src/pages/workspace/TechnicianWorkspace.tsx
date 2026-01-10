import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, Activity, FileText, Calendar, AlertTriangle, Clock, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KPICard, CaseListTable } from '@/components/workspace/SharedComponents'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { OperationalWorkspaceData } from '@/types/workspace'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

// Helper de Alertas com Cores de Borda
const getAlertDetails = (type: string, days: number) => {
  switch (type) {
    case 'PAF_NOT_STARTED': 
      return { label: 'PAF não iniciado', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', border: 'border-red-500' }
    case 'PAF_REVIEW_OVERDUE': 
      return { label: `Revisão vencida (${days}d)`, icon: Clock, color: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500' }
    case 'PAF_STALLED': 
      return { label: `Sem evolução (${days}d)`, icon: Activity, color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' }
    default: 
      return { label: 'Atenção necessária', icon: AlertTriangle, color: 'text-slate-600 dark:text-slate-400', border: 'border-slate-400' }
  }
}

export function TechnicianWorkspace({ data }: { data: OperationalWorkspaceData }) {
  const navigate = useNavigate()
  
  const awaitingCases = data.myCases.filter(c => c.status === 'EM_ACOLHIDA_ESPECIALIZADA')
  const activeCases = data.myCases.filter(c => c.status === 'EM_ACOMPANHAMENTO')
  const monitoringCases = data.myCases.filter(c => c.status === 'EM_MONITORAMENTO')

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPIs com Card de Ação "Ver Todos" Melhorado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Aguardando" value={data.detailedStats.acolhidaEsp || 0} icon={UserPlus} theme="orange" />
        <KPICard title="Ativos" value={data.detailedStats.acompanhamento || 0} icon={Users} theme="emerald" />
        <KPICard title="Monitoramento" value={data.detailedStats.monitoramento || 0} icon={Activity} theme="blue" />
        
        <Card 
          className="flex flex-col justify-center items-center border-dashed border-2 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group relative" 
          onClick={() => navigate(ROUTES.CASES)}
        >
           <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
             <FileText className="h-4 w-4"/> Ver Todos
           </span>
           <ChevronRight className="h-4 w-4 absolute right-4 opacity-0 group-hover:opacity-100 transition-all text-primary" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. COLUNA LATERAL */}
        <div className="space-y-6">
          <Card>
             <CardHeader className="pb-3 border-b bg-muted/20"><CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle></CardHeader>
             <CardContent className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start border-dashed hover:border-primary hover:text-primary transition-colors" onClick={() => navigate(ROUTES.CASES)}>
                  <Users className="mr-2 h-4 w-4"/> Gerenciar Casos
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => navigate(ROUTES.AGENDA)}>
                  <Calendar className="mr-2 h-4 w-4"/> Minha Agenda
                </Button>
             </CardContent>
          </Card>

          <UpcomingAppointments 
            data={data.appointments} 
            title="Hoje" 
            enableScroll 
          />

          {/* Alertas com Indicador Lateral */}
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-3 border-b bg-amber-50/50 dark:bg-amber-950/10">
               <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                 <Activity className="h-4 w-4"/> Alertas Prioritários
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {data.alerts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 text-green-500 mx-auto opacity-50 mb-2"/><p className="text-xs">Tudo em dia!</p></div>
                ) : (
                  data.alerts.map((alert) => {
                     const details = getAlertDetails(alert.type, alert.days)
                     const Icon = details.icon
                     return (
                       <div 
                         key={alert.id} 
                         onClick={() => navigate(`${ROUTES.CASES}/${alert.id}`)} 
                         className={cn(
                           "p-3 pl-4 border-b hover:bg-muted/50 cursor-pointer transition-colors group relative",
                           // Indicador lateral colorido
                           "border-l-[3px]", 
                           details.border
                         )}
                       >
                         <div className="flex justify-between items-start mb-1">
                           <span className="text-sm font-semibold truncate max-w-[180px] text-foreground group-hover:text-primary transition-colors">
                             {alert.nomeCompleto}
                           </span>
                         </div>
                         <div className={`flex items-center gap-2 text-xs ${details.color} font-medium`}>
                           <Icon className="h-3 w-3"/><span>{details.label}</span>
                         </div>
                       </div>
                     )
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 3. COLUNA PRINCIPAL (Abas Refinadas) */}
        <div className="lg:col-span-2 h-full">
          <Card className="h-full flex flex-col border shadow-sm bg-card">
             <Tabs defaultValue="active" className="h-full flex flex-col">
               <div className="px-4 pt-4 pb-0 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                       <FileText className="h-5 w-5 text-primary"/> Minhas Famílias
                     </h2>
                     <Badge variant="secondary" className="bg-muted text-muted-foreground">{data.myCases.length} total</Badge>
                  </div>
                  
                  <TabsList className="w-full justify-start h-10 p-0 bg-transparent gap-6 overflow-x-auto">
                     {/* Estilização personalizada para as abas (Underline animado) */}
                     {['awaiting', 'active', 'monitoring'].map((tab) => {
                        const labels: Record<string, string> = { awaiting: 'Aguardando', active: 'Acompanhamento', monitoring: 'Monitoramento' }
                        const counts: Record<string, number> = { awaiting: awaitingCases.length, active: activeCases.length, monitoring: monitoringCases.length }
                        
                        return (
                          <TabsTrigger 
                            key={tab} 
                            value={tab} 
                            className="
                              data-[state=active]:border-b-2 data-[state=active]:border-primary 
                              data-[state=active]:text-primary data-[state=active]:font-bold
                              rounded-none h-full px-1 pb-2 
                              text-muted-foreground hover:text-foreground transition-all gap-2
                            "
                          >
                            {labels[tab]} 
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">{counts[tab]}</Badge>
                          </TabsTrigger>
                        )
                     })}
                  </TabsList>
               </div>
               
               <CardContent className="flex-1 p-0 bg-muted/10 pt-4">
                  <TabsContent value="awaiting" className="m-0 h-full px-4"><CaseListTable cases={awaitingCases} isEspecialista={true} emptyMessage="Caixa de entrada vazia." /></TabsContent>
                  <TabsContent value="active" className="m-0 h-full px-4"><CaseListTable cases={activeCases} isEspecialista={true} emptyMessage="Nenhum caso em acompanhamento." /></TabsContent>
                  <TabsContent value="monitoring" className="m-0 h-full px-4"><CaseListTable cases={monitoringCases} isEspecialista={true} emptyMessage="Nenhum caso em monitoramento." /></TabsContent>
               </CardContent>
             </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}