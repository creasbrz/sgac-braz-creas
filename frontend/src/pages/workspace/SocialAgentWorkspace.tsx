import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertCircle, Calendar, UserPlus, Activity, CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KPICard, CaseListTable } from '@/components/workspace/SharedComponents'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { OperationalWorkspaceData } from '@/types/workspace'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

export function SocialAgentWorkspace({ data }: { data: OperationalWorkspaceData }) {
  const navigate = useNavigate()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  // Função para lidar com clique no alerta com feedback visual
  const handleAlertClick = (id: string) => {
    setNavigatingId(id)
    // Pequeno delay visual ou navegação imediata
    navigate(`${ROUTES.CASES}/${id}`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. KPIs Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Para Iniciar" 
          value={data.detailedStats.meusAguardando || 0} 
          icon={AlertCircle} 
          theme="purple" 
          subtitle="Aguardando sua ação" 
          onClick={() => navigate(ROUTES.WAITING_LIST)} 
        />
        <KPICard 
          title="Em Acolhida" 
          value={data.detailedStats.meusEmAtendimento || 0} 
          icon={Users} 
          theme="blue" 
          subtitle="Atendimentos ativos" 
        />
        <KPICard 
          title="Agenda Hoje" 
          value={data.appointments.length} 
          icon={Calendar} 
          theme="emerald" 
          subtitle="Compromissos" 
          onClick={() => navigate(ROUTES.AGENDA)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. COLUNA LATERAL (Ações e Pendências) */}
        <div className="space-y-6">
          <Button 
            className="w-full h-12 text-base shadow-sm bg-purple-600 hover:bg-purple-700 text-white transition-all active:scale-[0.98]" 
            onClick={() => navigate(ROUTES.WAITING_LIST)}
          >
             <UserPlus className="mr-2 h-5 w-5"/> Iniciar Nova Acolhida
          </Button>

          {/* Agenda - "Memória Externa" do Agente */}
          <UpcomingAppointments 
            data={data.appointments} 
            title="Agenda de Hoje" 
            description="" 
            enableScroll 
          />

          {/* Card de Alertas - Priorização Inteligente */}
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-3 border-b bg-amber-50/50 dark:bg-amber-950/10">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Activity className="h-4 w-4"/> Alertas e Pendências
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                {data.alerts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2 opacity-80"/>
                    <p className="text-xs font-medium">Você não tem pendências.</p>
                  </div>
                ) : (
                  data.alerts.map((alert) => {
                    // Lógica de Severidade: > 7 dias torna-se crítico
                    const isCritical = alert.days > 7
                    const isNavigating = navigatingId === alert.id

                    return (
                     <div 
                        key={alert.id} 
                        onClick={() => !isNavigating && handleAlertClick(alert.id)} 
                        className={cn(
                          "p-3 border-b cursor-pointer transition-colors relative group",
                          isCritical 
                            ? "hover:bg-red-50 dark:hover:bg-red-900/10" 
                            : "hover:bg-amber-50 dark:hover:bg-amber-900/10",
                          isNavigating && "opacity-70 pointer-events-none bg-muted"
                        )}
                     >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-semibold truncate text-foreground pr-2">
                            {alert.nomeCompleto}
                          </span>
                          {isNavigating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-2 text-xs font-medium",
                          isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        )}>
                          {isCritical ? <AlertTriangle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
                          <span>
                            {isCritical ? `Crítico: ${alert.days} dias parado` : `Pendente há ${alert.days} dias`}
                          </span>
                        </div>
                     </div>
                    )
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 3. COLUNA PRINCIPAL (Execução) */}
        <div className="lg:col-span-2 h-full">
          <Card className="h-full flex flex-col border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Users className="h-5 w-5 text-primary"/> Meus Casos Ativos
                </CardTitle>
                <Badge variant="secondary" className="px-2">{data.myCases.length}</Badge>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-muted/10 pt-2 px-2">
              <CaseListTable 
                cases={data.myCases} 
                isEspecialista={false} 
                emptyMessage="Você não possui casos ativos no momento." 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}