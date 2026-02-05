// frontend/src/pages/workspace/TechnicianWorkspace.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, Activity, FileText, Calendar, AlertTriangle, 
  Clock, AlertCircle, CheckCircle2, Loader2, 
  ClipboardList, ShieldCheck
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

// [CORREÇÃO TS] Importar o tipo do componente consumidor para garantir compatibilidade
import type { UpcomingAppointment } from '@/components/agenda/UpcomingAppointments'

// Sub-componente de Alerta
const TechnicianAlertItem = ({ alert, isNavigating, onClick }: { alert: any, isNavigating: boolean, onClick: () => void }) => {
  const days = alert.days || 0
  
  const getStyle = (type: string) => {
    switch (type) {
      case 'PAF_NOT_STARTED': return { icon: AlertCircle, text: 'PAF não iniciado', color: 'text-status-error-fg', border: 'border-l-status-error-fg', bg: 'hover:bg-status-error-bg/20' }
      case 'PAF_REVIEW_OVERDUE': return { icon: Clock, text: `Revisão vencida (${days}d)`, color: 'text-status-warning-fg', border: 'border-l-status-warning-fg', bg: 'hover:bg-status-warning-bg/20' }
      case 'PAF_STALLED': return { icon: Activity, text: `Sem evolução (${days}d)`, color: 'text-status-warning-fg', border: 'border-l-status-warning-fg', bg: 'hover:bg-status-warning-bg/20' }
      default: return { icon: AlertTriangle, text: 'Atenção necessária', color: 'text-muted-foreground', border: 'border-l-muted-foreground', bg: 'hover:bg-muted/50' }
    }
  }
  const style = getStyle(alert.type)
  const Icon = style.icon

  return (
    <button 
      type="button"
      onClick={onClick}
      disabled={isNavigating}
      // [CORREÇÃO TAILWIND] border-l-[4px] -> border-l-4
      className={cn(
        "w-full text-left group relative p-3 pl-4 border-b last:border-0 transition-all duration-200 bg-card border-l-4", 
        style.border, 
        style.bg, 
        isNavigating && "opacity-70 pointer-events-none bg-muted"
      )}
    >
      <div className="flex justify-between items-start mb-1 gap-2">
        {/* [CORREÇÃO TAILWIND] max-w-[200px] -> max-w-50 */}
        <span className="text-sm font-semibold truncate max-w-50 text-foreground group-hover:text-primary transition-colors">
          {alert.nomeCompleto || 'Beneficiário Anônimo'}
        </span>
        {isNavigating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className={cn("flex items-center gap-2 text-xs font-medium", style.color)}>
        <Icon className="h-3.5 w-3.5"/>
        <span>{style.text}</span>
      </div>
    </button>
  )
}

export function TechnicianWorkspace({ data }: { data?: OperationalWorkspaceData }) {
  const navigate = useNavigate()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active") 

  const safeData = useMemo(() => {
    if (!data) return null;
    return {
      appointments: Array.isArray(data.appointments) ? data.appointments : [],
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
      myCases: Array.isArray(data.myCases) ? data.myCases : [],
      stats: data.detailedStats || { acolhidaEsp: 0, acompanhamento: 0, monitoramento: 0 }
    };
  }, [data]);
  
  if (!safeData) return (
    <div className="flex h-[50vh] flex-col items-center justify-center p-12 text-muted-foreground gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
      <p className="text-sm font-medium uppercase tracking-widest">Carregando painel...</p>
    </div>
  )

  const { appointments, alerts, myCases, stats } = safeData;
  const receptionCases = myCases.filter(c => c && c.status === 'EM_ACOLHIDA_ESPECIALIZADA');
  const activeCases = myCases.filter(c => c && c.status === 'EM_ACOMPANHAMENTO');
  const monitoringCases = myCases.filter(c => c && c.status === 'EM_MONITORAMENTO');

  const handleAlertClick = (id: string) => {
    setNavigatingId(id)
    navigate(`/app/cases/${id}`)
  }

  // [CORREÇÃO TS] Validação e casting dos tipos para UpcomingAppointment
  const mappedAppointments: UpcomingAppointment[] = appointments
    .filter(apt => !!apt)
    .map((apt: any) => {
      // Normaliza o tipo vindo do backend para os tipos aceitos pelo componente
      let tipoNormalizado: "ATENDIMENTO" | "VISITA" | "AUDIENCIA" = "ATENDIMENTO";
      const tipoRaw = apt.tipo ? String(apt.tipo).toUpperCase() : "";
      
      if (tipoRaw === "VISITA") tipoNormalizado = "VISITA";
      else if (tipoRaw === "AUDIENCIA") tipoNormalizado = "AUDIENCIA";
      
      return {
        id: apt.id ?? Math.random().toString(),
        titulo: apt.titulo ?? 'Atendimento',
        data: apt.data ?? apt.dataAgendamento ?? new Date().toISOString(),
        tipo: tipoNormalizado,
        caso: apt.caso ? { 
          id: apt.caso.id ?? '', 
          nomeCompleto: apt.caso.nomeCompleto ?? 'Anônimo' 
        } : undefined
      };
    });

  return (
    // Altura calculada para ocupar a tela (Viewport Height)
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 pb-6 p-1">
      
      {/* 1. SEÇÃO DE KPIs (Altura Fixa) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 flex-none">
        <KPICard 
          title="Elaboração de PAF" 
          value={stats.acolhidaEsp || 0} 
          icon={ClipboardList} 
          theme="orange" 
          subtitle="Acolhida Especializada" 
          onClick={() => setActiveTab("reception")} 
        />
        <KPICard 
          title="Em Acompanhamento" 
          value={stats.acompanhamento || 0} 
          icon={Users} 
          theme="emerald" 
          subtitle="Ativo" 
          onClick={() => setActiveTab("active")} 
        />
        <KPICard 
          title="Em Monitoramento" 
          value={stats.monitoramento || 0} 
          icon={ShieldCheck} 
          theme="blue" 
          subtitle="Fase Final" 
          onClick={() => setActiveTab("monitoring")} 
        />
        <button 
          onClick={() => navigate(ROUTES.CASES)}
          className="flex flex-col justify-center items-center border-dashed border-2 border-border bg-transparent hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group rounded-xl shadow-sm h-full min-h-22.5"
        >
           <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2">
             <FileText className="h-4 w-4"/> Ver Todos os Casos
           </span>
        </button>
      </div>

      {/* 2. ÁREA DE CONTEÚDO (Grid Flexível) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA (Sidebar) */}
        <aside className="flex flex-col gap-6 h-full overflow-hidden">
          
          {/* Card de Ações Rápidas */}
          <Card className="shadow-sm shrink-0 border-l-4 border-l-primary">
             <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/10">
               <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ações Rápidas</CardTitle>
             </CardHeader>
             <CardContent className="p-3 grid gap-2">
                <Button variant="outline" className="w-full justify-start h-9 text-sm hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => navigate(ROUTES.CASES)}>
                  <Users className="mr-2 h-4 w-4 opacity-70"/> Gerenciar Casos
                </Button>
                <Button variant="outline" className="w-full justify-start h-9 text-sm hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => navigate(ROUTES.AGENDA)}>
                  <Calendar className="mr-2 h-4 w-4 opacity-70"/> Minha Agenda
                </Button>
             </CardContent>
          </Card>

          {/* Agenda (Ocupa espaço disponível) */}
          <div className="flex-1 min-h-0 flex flex-col">
            <UpcomingAppointments 
              data={mappedAppointments} 
              title="Agenda Hoje" 
              enableScroll 
              className="h-full border-border/60 shadow-sm"
            />
          </div>
          
          {/* Pendências do PAF (Altura Limitada) */}
          <Card className="flex flex-col border shadow-sm overflow-hidden bg-card flex-none max-h-[35%]">
            <div className="px-4 py-3 border-b border-border bg-status-warning-bg/20 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-status-warning-fg">
                  <Activity className="h-4 w-4"/>
                  <h3 className="text-sm font-bold leading-none">Pendências do PAF</h3>
               </div>
               <Badge variant="secondary" className="bg-background text-foreground shadow-sm text-[10px] h-5 px-1.5">
                 {alerts.length}
               </Badge>
            </div>
            
            <CardContent className="p-0 bg-muted/5 flex-1 relative min-h-0">
              <ScrollArea className="h-full">
                 {alerts.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2 p-6 text-center opacity-60">
                     <CheckCircle2 className="h-8 w-8 text-status-success-fg"/>
                     <div>
                       <p className="text-sm font-medium">PAFs atualizados!</p>
                       <p className="text-xs">Nenhuma revisão pendente.</p>
                     </div>
                   </div>
                 ) : (
                   <div className="divide-y divide-border/40 border-t border-border/40">
                     {alerts.map((alert) => (
                       alert ? 
                       <TechnicianAlertItem 
                         key={alert.id || Math.random()} 
                         alert={alert} 
                         isNavigating={navigatingId === alert.id} 
                         onClick={() => alert.id && !navigatingId && handleAlertClick(alert.id)} 
                       /> : null
                     ))}
                   </div>
                 )}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* COLUNA PRINCIPAL (Abas de Casos) */}
        <main className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <Card className="flex flex-col border shadow-sm overflow-hidden bg-card h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                
                {/* Header Fixo */}
                <div className="px-6 pt-6 pb-0 border-b border-border bg-card shrink-0 z-10">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                        <FileText className="h-5 w-5"/>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground leading-none">Gestão de Casos</h2>
                        <p className="text-sm text-muted-foreground mt-1">Visão técnica dos casos sob sua responsabilidade</p>
                      </div>
                  </div>
                  
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6 border-b-0 overflow-x-auto custom-scrollbar pb-1">
                      <TabsTrigger 
                        value="reception" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                      >
                        Acolhida Esp. 
                        <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">{receptionCases.length}</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="active" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                      >
                        Em Acompanhamento 
                        <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">{activeCases.length}</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="monitoring" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                      >
                        Monitoramento 
                        <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">{monitoringCases.length}</span>
                      </TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Conteúdo Scrollável Independente */}
                {/* [CORREÇÃO TAILWIND] min-h-[500px] -> min-h-125 */}
                <CardContent className="p-0 bg-muted/5 flex-1 relative min-h-125">
                   <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                      <TabsContent value="reception" className="m-0 min-h-full">
                        <CaseListTable cases={receptionCases} isEspecialista={true} emptyMessage="Nenhum caso em Acolhida Especializada." />
                      </TabsContent>
                      <TabsContent value="active" className="m-0 min-h-full">
                        <CaseListTable cases={activeCases} isEspecialista={true} emptyMessage="Nenhum caso em acompanhamento regular." />
                      </TabsContent>
                      <TabsContent value="monitoring" className="m-0 min-h-full">
                        <CaseListTable cases={monitoringCases} isEspecialista={true} emptyMessage="Nenhum caso em monitoramento." />
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