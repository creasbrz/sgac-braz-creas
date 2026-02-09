// frontend/src/pages/workspace/SocialAgentWorkspace.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, AlertCircle, Calendar, UserPlus, Activity, 
  CheckCircle2, Clock, Loader2, ArrowRight, FileText 
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { KPICard, CaseListTable } from '@/components/workspace/SharedComponents'
import { UpcomingAppointments } from '@/components/agenda/UpcomingAppointments'
import { OperationalWorkspaceData, CaseAlert } from '@/types/workspace' // Importe CaseAlert
import { ROUTES } from '@/constants/app-routes'
import { cn } from '@/lib/utils'
import type { UpcomingAppointment } from '@/components/agenda/UpcomingAppointments'

// Interface estendida para acomodar propriedades dinâmicas ou calculadas
interface ExtendedAlert extends CaseAlert {
  days?: number;
}

// --- WORKSPACE COMPONENT ---

export function SocialAgentWorkspace({ data }: { data?: OperationalWorkspaceData }) {
  const navigate = useNavigate()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  // [PERFORMANCE & BLINDAGEM] Hook unificado para dados transformados
  const safeData = useMemo(() => {
    if (!data) return null;

    const rawAppointments = Array.isArray(data.appointments) ? data.appointments : []
    
    // Mapeamento seguro para evitar erros de tipagem no componente filho
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

    // Casting seguro para alertas
    const alerts = (Array.isArray(data.alerts) ? data.alerts : []) as ExtendedAlert[];

    return {
      appointments: mappedAppointments,
      alerts: alerts,
      myCases: Array.isArray(data.myCases) ? data.myCases : [],
      stats: data.detailedStats || { meusAguardando: 0, meusEmAtendimento: 0 }
    };
  }, [data]);

  // --- LOADING STATE ---
  if (!safeData) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-8 text-muted-foreground gap-3 animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-sm font-medium uppercase tracking-widest">Sincronizando workspace...</p>
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
    // Container principal ocupando a altura disponível
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-700 p-1">
      
      {/* 1. SEÇÃO DE KPIs (Altura Fixa) */}
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

      {/* 2. ÁREA DE CONTEÚDO (Grid Flexível) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA (Ferramentas e Agenda) */}
        <aside className="flex flex-col h-full gap-4 overflow-hidden">
          
          {/* A. Botão de Ação */}
          <Card className="flex-none bg-status-ai-bg border-status-ai-border shadow-sm group hover:border-status-ai-fg/30 transition-colors">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 text-status-ai-fg">
                <div className="p-2 bg-background/50 rounded-lg shadow-sm">
                   <UserPlus className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Novos Atendimentos</p>
                  <p className="text-xs opacity-80">Busque casos na fila geral</p>
                </div>
              </div>
              <Button 
                className="w-full shadow-sm bg-status-ai-fg hover:bg-status-ai-fg/90 text-white font-medium" 
                onClick={() => navigate(ROUTES.WAITING_LIST)}
              >
                 Pegar da Fila Geral <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
              </Button>
            </CardContent>
          </Card>

          {/* B. Agenda (Ocupa espaço restante) */}
          <div className="flex-1 min-h-0 flex flex-col">
             <UpcomingAppointments 
               data={appointments} 
               title="Agenda Rápida" 
               enableScroll={true}
               className="h-full border-border/60 shadow-sm"
             />
          </div>

          {/* C. Alertas (Altura limitada) */}
          <Card className="flex-none border-l-4 border-l-status-warning-fg shadow-sm flex flex-col overflow-hidden bg-card max-h-[35%]">
            <CardHeader className="pb-2 border-b bg-status-warning-bg/30 px-4 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-status-warning-fg">
                  <Activity className="h-4 w-4"/> 
                  Alertas e Pendências
                </CardTitle>
                {alerts.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background text-foreground shadow-sm">
                    {alerts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-0 overflow-hidden flex-1">
              {/* max-h-62.5 = 250px */}
              <ScrollArea className="h-full max-h-62.5">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2 opacity-60">
                    <CheckCircle2 className="h-6 w-6 text-status-success-fg"/>
                    <p className="text-xs font-medium">Tudo em dia!</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {alerts.map((alert) => {
                      if (!alert) return null;
                      // [CORREÇÃO] Acesso seguro à propriedade opcional 'days'
                      const days = alert.days ?? 0; 
                      const isCritical = days > 7
                      const isNavigating = navigatingId === alert.id

                      return (
                        <li key={alert.id || Math.random()}>
                          <button
                            type="button"
                            onClick={() => alert.id && !isNavigating && handleAlertClick(alert.id)}
                            disabled={isNavigating}
                            className={cn(
                              "w-full text-left p-3 transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted group relative",
                              isCritical && "bg-status-error-bg/30 hover:bg-status-error-bg/50",
                              isNavigating && "opacity-60 cursor-wait"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "text-sm font-semibold truncate pr-2 transition-colors",
                                isCritical ? "text-status-error-fg" : "text-foreground"
                              )}>
                                {alert.nomeCompleto || 'Sem Nome'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <div className={cn(
                                "flex items-center gap-1 font-medium",
                                isCritical ? "text-status-error-fg" : "text-status-warning-fg"
                              )}>
                                {isCritical ? <AlertCircle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
                                <span>{isCritical ? 'Crítico' : 'Pendente'}</span>
                              </div>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-muted-foreground font-medium">há {days}d</span>
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

        {/* COLUNA PRINCIPAL (Lista de Casos) */}
        <main className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <Card className="h-full flex flex-col border shadow-sm bg-card overflow-hidden">
              
             {/* Header das Abas */}
             <div className="px-6 pt-6 pb-0 shrink-0 border-b border-border/40 bg-background z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                           <FileText className="h-5 w-5 text-primary"/>
                        </div>
                        Minhas Famílias
                      </h2>
                      <p className="text-sm text-muted-foreground ml-9">
                        Gerencie os casos sob sua responsabilidade técnica.
                      </p>
                    </div>
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                   <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-8 border-b border-border/0">
                      <TabsTrigger 
                        value="active" 
                        className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 pb-3 pt-2 gap-2 transition-all hover:text-foreground/80"
                      >
                        Em Acolhida 
                        <Badge variant="secondary" className="bg-muted text-foreground ml-1 pointer-events-none text-[10px] h-5 px-1.5">
                          {stats.meusEmAtendimento}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="awaiting" 
                        className="data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-1 pb-3 pt-2 gap-2 transition-all hover:text-foreground/80"
                      >
                        Para Iniciar 
                        <Badge variant="secondary" className="bg-muted text-foreground ml-1 pointer-events-none text-[10px] h-5 px-1.5">
                          {stats.meusAguardando}
                        </Badge>
                      </TabsTrigger>
                   </TabsList>
                </Tabs>
             </div>
             
             {/* Conteúdo Scrollável */}
             <div className="flex-1 overflow-hidden relative bg-muted/5">
               <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                 {activeTab === 'active' && (
                    <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <CaseListTable 
                        cases={activeCases} 
                        isEspecialista={false} 
                        emptyMessage="Nenhum caso em acolhida no momento." 
                      />
                    </div>
                 )}
                 {activeTab === 'awaiting' && (
                    <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <CaseListTable 
                        cases={awaitingCases} 
                        isEspecialista={false} 
                        emptyMessage="Nenhum caso aguardando início." 
                      />
                    </div>
                 )}
               </div>
             </div>
          </Card>
        </main>

      </div>
    </div>
  )
}