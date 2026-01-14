// frontend/src/pages/workspace/SocialAgentWorkspace.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, AlertCircle, Calendar, UserPlus, Activity, 
  CheckCircle2, Clock, Loader2, AlertTriangle, FileText, ArrowRight 
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { KPICard, CaseListTable } from '@/components/workspace/SharedComponents'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { OperationalWorkspaceData } from '@/types/workspace'
import { ROUTES } from '@/constants/app-routes'
import { cn } from '@/lib/utils'
import type { UpcomingAppointment } from '@/types/agenda'

// --- WORKSPACE COMPONENT ---

export function SocialAgentWorkspace({ data }: { data?: OperationalWorkspaceData }) {
  const navigate = useNavigate()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  // [PERFORMANCE & BLINDAGEM] Hook unificado para dados transformados
  const safeData = useMemo(() => {
    if (!data) return null;

    const rawAppointments = Array.isArray(data.appointments) ? data.appointments : []
    
    const mappedAppointments: UpcomingAppointment[] = rawAppointments
      .filter(apt => apt !== null && apt !== undefined)
      .map((apt: any) => ({
        id: apt?.id || Math.random().toString(),
        titulo: apt?.titulo || 'Atendimento',
        data: apt?.data || apt?.dataAgendamento || new Date().toISOString(),
        tipo: apt?.tipo || 'Agendamento',
        caso: apt?.caso ? {
          id: apt.caso.id || '',
          nomeCompleto: apt.caso.nomeCompleto || 'Anônimo'
        } : undefined
      }));

    return {
      appointments: mappedAppointments,
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
      myCases: Array.isArray(data.myCases) ? data.myCases : [],
      stats: data.detailedStats || { meusAguardando: 0, meusEmAtendimento: 0 }
    };
  }, [data]);

  // --- LOADING STATE ---
  if (!safeData) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-8 text-muted-foreground gap-3 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-sm font-medium">Sincronizando workspace...</p>
      </div>
    )
  }

  const { appointments, alerts, myCases, stats } = safeData;

  const awaitingCases = myCases.filter(c => c && c.status === 'AGUARDANDO_ACOLHIDA')
  const activeCases = myCases.filter(c => c && c.status === 'EM_ACOLHIDA')

  const handleAlertClick = (id: string) => {
    if (!id) return
    setNavigatingId(id)
    navigate(`/app/cases/${id}`)
  }

  return (
    // Container principal ocupando a altura disponível da tela (ajuste o calc conforme seu header)
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-700 p-1">
      
      {/* 1. SEÇÃO DE KPIs (Altura Fixa, não cresce) */}
      <section aria-label="Indicadores de Performance" className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-none">
        <KPICard 
          title="Para Iniciar" 
          value={stats.meusAguardando || 0} 
          icon={AlertCircle} 
          theme="purple" 
          subtitle="Casos aguardando sua ação" 
          onClick={() => setActiveTab("awaiting")} 
        />
        <KPICard 
          title="Em Acolhida" 
          value={stats.meusEmAtendimento || 0} 
          icon={Users} 
          theme="blue" 
          subtitle="Famílias em atendimento" 
          onClick={() => setActiveTab("active")} 
        />
        <KPICard 
          title="Compromissos" 
          value={appointments.length} 
          icon={Calendar} 
          theme="emerald" 
          subtitle="Agendados para hoje" 
          onClick={() => navigate(ROUTES.AGENDA)} 
        />
      </section>

      {/* 2. ÁREA DE CONTEÚDO (Grid que preenche o resto da altura) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA (Flex Column para controlar alturas internas) */}
        <aside className="flex flex-col h-full gap-4 overflow-hidden">
          
          {/* A. Botão de Ação (Tamanho Fixo) */}
          <Card className="flex-none bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-sm">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-purple-700 dark:text-purple-300">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                   <UserPlus className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Novos Atendimentos</p>
                  <p className="text-xs opacity-80">Busque casos na fila geral</p>
                </div>
              </div>
              <Button 
                className="w-full shadow-sm bg-purple-600 hover:bg-purple-700 text-white" 
                onClick={() => navigate(ROUTES.WAITING_LIST)}
              >
                 Pegar da Fila Geral <ArrowRight className="ml-2 h-4 w-4"/>
              </Button>
            </CardContent>
          </Card>

          {/* B. Agenda (FLEXÍVEL - Ocupa o espaço que sobrar) */}
          {/* Envolvemos em uma div com flex-1 e min-h-0 para forçar o scroll interno */}
          <div className="flex-1 min-h-0 flex flex-col">
             <UpcomingAppointments 
                data={appointments} 
                title="Agenda Rápida" 
                enableScroll={true}
                // O componente precisa aceitar className="h-full" ou ter estilo interno para expandir
                // Caso o componente UpcomingAppointments não expanda sozinho, 
                // o container pai aqui (div flex-1) vai limitar o tamanho dele.
                className="h-full"
             />
          </div>

          {/* C. Alertas (Tamanho Fixo ou Limitado) */}
          <Card className="flex-none border-l-4 border-l-amber-500 shadow-sm flex flex-col overflow-hidden bg-card max-h-[35%]">
            <CardHeader className="pb-2 border-b bg-amber-50/50 dark:bg-amber-950/10 px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-500">
                  <Activity className="h-4 w-4"/> 
                  Alertas e Pendências
                </CardTitle>
                {alerts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {alerts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-0 overflow-hidden flex-1">
              <ScrollArea className="h-full max-h-[250px]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500/60"/>
                    <p className="text-xs font-medium">Sem pendências.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {alerts.map((alert) => {
                      if (!alert) return null;
                      const isCritical = (alert.days || 0) > 7
                      const isNavigating = navigatingId === alert.id

                      return (
                        <li key={alert.id || Math.random()}>
                          <button
                            type="button"
                            onClick={() => alert.id && !isNavigating && handleAlertClick(alert.id)}
                            disabled={isNavigating}
                            className={cn(
                              "w-full text-left p-3 transition-all hover:bg-amber-50/50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 group relative",
                              isCritical && "bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/60",
                              isNavigating && "opacity-60 cursor-wait"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "text-sm font-semibold truncate pr-2 transition-colors",
                                isCritical ? "text-red-700 dark:text-red-400" : "text-foreground"
                              )}>
                                {alert.nomeCompleto || 'Sem Nome'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <div className={cn(
                                "flex items-center gap-1 font-medium",
                                isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                              )}>
                                {isCritical ? <AlertTriangle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
                                <span>{isCritical ? 'Crítico' : 'Pendente'}</span>
                              </div>
                              <span className="text-muted-foreground/60">•</span>
                              <span className="text-muted-foreground">há {alert.days}d</span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* COLUNA PRINCIPAL (Abas de Casos) */}
        <main className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <Card className="h-full flex flex-col border shadow-sm bg-card overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
               
               {/* Header das Abas */}
               <div className="px-6 pt-6 pb-0 shrink-0">
                  <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary"/> Minhas Famílias
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Gerencie os casos sob sua responsabilidade técnica.
                        </p>
                      </div>
                  </div>
                  
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-6">
                      <TabsTrigger 
                        value="active" 
                        className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-2 pb-3 pt-2 gap-2 transition-none"
                      >
                        Em Acolhida 
                        <Badge variant="secondary" className="bg-muted text-foreground ml-1 pointer-events-none">
                          {stats.meusEmAtendimento}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="awaiting" 
                        className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-2 pb-3 pt-2 gap-2 transition-none"
                      >
                        Para Iniciar 
                        <Badge variant="secondary" className="bg-muted text-foreground ml-1 pointer-events-none">
                          {stats.meusAguardando}
                        </Badge>
                      </TabsTrigger>
                  </TabsList>
               </div>
               
               {/* Conteúdo das Abas (Scrollável) */}
               <CardContent className="flex-1 p-0 bg-muted/5 mt-0 min-h-0 relative">
                  <div className="absolute inset-0 overflow-auto">
                    <TabsContent value="active" className="m-0 h-full p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <CaseListTable 
                        cases={activeCases} 
                        isEspecialista={false} 
                        emptyMessage="Nenhum caso em acolhida no momento." 
                      />
                    </TabsContent>
                    <TabsContent value="awaiting" className="m-0 h-full p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <CaseListTable 
                        cases={awaitingCases} 
                        isEspecialista={false} 
                        emptyMessage="Nenhum caso aguardando início." 
                      />
                    </TabsContent>
                  </div>
               </CardContent>
            </Tabs>
          </Card>
        </main>

      </div>
    </div>
  )
}