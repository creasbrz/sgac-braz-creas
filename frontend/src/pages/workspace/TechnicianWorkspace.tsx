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
import type { UpcomingAppointment } from '@/types/agenda'

// Sub-componente de Alerta (Harmonizado com Gestão de Casos)
const TechnicianAlertItem = ({ alert, isNavigating, onClick }: { alert: any, isNavigating: boolean, onClick: () => void }) => {
  const days = alert.days || 0
  
  const getStyle = (type: string) => {
    switch (type) {
      case 'PAF_NOT_STARTED': return { icon: AlertCircle, text: 'PAF não iniciado', color: 'text-red-600 dark:text-red-400', border: 'border-l-red-500', bg: 'hover:bg-red-50 dark:hover:bg-red-900/10' }
      case 'PAF_REVIEW_OVERDUE': return { icon: Clock, text: `Revisão vencida (${days}d)`, color: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-500', bg: 'hover:bg-orange-50 dark:hover:bg-orange-900/10' }
      case 'PAF_STALLED': return { icon: Activity, text: `Sem evolução (${days}d)`, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500', bg: 'hover:bg-amber-50 dark:hover:bg-amber-900/10' }
      default: return { icon: AlertTriangle, text: 'Atenção necessária', color: 'text-slate-600 dark:text-slate-400', border: 'border-l-slate-400', bg: 'hover:bg-slate-50 dark:hover:bg-slate-900/10' }
    }
  }
  const style = getStyle(alert.type)
  const Icon = style.icon

  return (
    <div onClick={onClick} className={cn("group relative p-3 pl-4 border-b last:border-0 cursor-pointer transition-colors duration-200 bg-card hover:bg-muted/50 border-l-[4px]", style.border, style.bg, isNavigating && "opacity-70 pointer-events-none bg-muted")}>
      <div className="flex justify-between items-start mb-1 gap-2">
        <span className="text-sm font-semibold truncate max-w-[200px] text-foreground group-hover:text-primary transition-colors">{alert.nomeCompleto || 'Beneficiário Anônimo'}</span>
        {isNavigating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className={cn("flex items-center gap-2 text-xs font-medium", style.color)}><Icon className="h-3.5 w-3.5"/><span>{style.text}</span></div>
    </div>
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
  
  if (!safeData) return <div className="flex h-full flex-col items-center justify-center p-12 text-muted-foreground gap-3"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-sm font-medium">Carregando...</p></div>

  const { appointments, alerts, myCases, stats } = safeData;
  const receptionCases = myCases.filter(c => c && c.status === 'EM_ACOLHIDA_ESPECIALIZADA');
  const activeCases = myCases.filter(c => c && c.status === 'EM_ACOMPANHAMENTO');
  const monitoringCases = myCases.filter(c => c && c.status === 'EM_MONITORAMENTO');

  const handleAlertClick = (id: string) => {
    setNavigatingId(id)
    navigate(`/app/cases/${id}`)
  }

  const mappedAppointments: UpcomingAppointment[] = appointments.filter(apt => !!apt).map((apt: any) => ({
      id: apt.id ?? Math.random().toString(),
      titulo: apt.titulo ?? 'Atendimento',
      data: apt.data ?? apt.dataAgendamento ?? new Date().toISOString(),
      tipo: apt.tipo ?? 'Agendamento',
      caso: apt.caso ? { id: apt.caso.id ?? '', nomeCompleto: apt.caso.nomeCompleto ?? 'Anônimo' } : undefined
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-6">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <KPICard title="Elaboração de PAF" value={stats.acolhidaEsp || 0} icon={ClipboardList} theme="orange" subtitle="Acolhida Especializada" onClick={() => setActiveTab("reception")} />
        <KPICard title="Em Acompanhamento" value={stats.acompanhamento || 0} icon={Users} theme="emerald" subtitle="Ativo" onClick={() => setActiveTab("active")} />
        <KPICard title="Em Monitoramento" value={stats.monitoramento || 0} icon={ShieldCheck} theme="blue" subtitle="Fase Final" onClick={() => setActiveTab("monitoring")} />
        <Card className="flex flex-col justify-center items-center border-dashed border-2 border-slate-200 dark:border-slate-700 bg-transparent hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group shadow-sm" onClick={() => navigate(ROUTES.CASES)}>
           <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-2"><FileText className="h-4 w-4"/> Ver Todos os Casos</span>
        </Card>
      </div>

      {/* Grid Principal - Ajustado para alinhamento melhor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Coluna Esquerda (Sidebar) - Flex col para distribuir altura */}
        <div className="flex flex-col gap-6 h-full">
          {/* Card de Ações Rápidas */}
          <Card className="shadow-sm shrink-0">
             <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/10"><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ações Rápidas</CardTitle></CardHeader>
             <CardContent className="p-3 grid gap-2">
                <Button variant="outline" className="w-full justify-start h-9 text-sm" onClick={() => navigate(ROUTES.CASES)}><Users className="mr-2 h-4 w-4 text-muted-foreground"/> Gerenciar Casos</Button>
                <Button variant="outline" className="w-full justify-start h-9 text-sm" onClick={() => navigate(ROUTES.AGENDA)}><Calendar className="mr-2 h-4 w-4 text-muted-foreground"/> Minha Agenda</Button>
             </CardContent>
          </Card>

          {/* Agenda */}
          <div className="shrink-0">
            <UpcomingAppointments data={mappedAppointments} title="Agenda Hoje" enableScroll />
          </div>
          
          {/* Pendências do PAF (Flex-1 para ocupar o resto do espaço se necessário, mas com altura fixa no scroll) */}
          <Card className="flex flex-col border shadow-sm overflow-hidden bg-card flex-1 min-h-[300px]">
            <div className="px-5 pt-5 pb-3 border-b border-border bg-card">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-500"><Activity className="h-5 w-5"/></div>
                  <div className="flex-1"><h3 className="text-sm font-bold text-foreground leading-none">Pendências do PAF</h3><p className="text-[11px] text-muted-foreground mt-1">Ações prioritárias e atrasos</p></div>
                  <Badge variant="outline" className="ml-auto border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">{alerts.length}</Badge>
               </div>
            </div>
            <CardContent className="p-0 bg-muted/5 flex-1 relative">
              {/* Absolute inset-0 para garantir que o scroll area ocupe todo o espaço do pai flexível */}
              <div className="absolute inset-0">
                <ScrollArea className="h-full">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-6 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-500/50"/><div><p className="text-sm font-medium">PAFs atualizados!</p><p className="text-xs opacity-70">Nenhuma revisão pendente.</p></div></div>
                  ) : (
                    <div className="divide-y border-t border-border/50">
                      {alerts.map((alert) => (alert ? <TechnicianAlertItem key={alert.id || Math.random()} alert={alert} isNavigating={navigatingId === alert.id} onClick={() => alert.id && !navigatingId && handleAlertClick(alert.id)} /> : null))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Principal */}
        <div className="lg:col-span-2 h-full">
          <Card className="flex flex-col border shadow-sm overflow-hidden bg-card h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-6 pt-6 pb-0 border-b border-border bg-card shrink-0">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-5 w-5 text-primary"/></div>
                      <div><h2 className="text-lg font-bold text-foreground leading-none">Gestão de Casos</h2><p className="text-sm text-muted-foreground mt-1">Visão técnica dos casos sob sua responsabilidade</p></div>
                  </div>
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6 border-b-0 overflow-x-auto scrollbar-hide">
                      <TabsTrigger value="reception" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all">Acolhida Esp. <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">{receptionCases.length}</span></TabsTrigger>
                      <TabsTrigger value="active" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all">Em Acompanhamento <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">{activeCases.length}</span></TabsTrigger>
                      <TabsTrigger value="monitoring" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-3 text-sm font-medium text-muted-foreground transition-all">Monitoramento <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">{monitoringCases.length}</span></TabsTrigger>
                  </TabsList>
                </div>
                
                <CardContent className="p-0 bg-muted/5 flex-1 relative min-h-[500px]">
                   {/* Layout absoluto para o conteúdo da tab preencher a altura do card pai */}
                   <div className="absolute inset-0 overflow-auto">
                      <TabsContent value="reception" className="m-0 h-full"><CaseListTable cases={receptionCases} isEspecialista={true} emptyMessage="Nenhum caso em Acolhida Especializada." /></TabsContent>
                      <TabsContent value="active" className="m-0 h-full"><CaseListTable cases={activeCases} isEspecialista={true} emptyMessage="Nenhum caso em acompanhamento regular." /></TabsContent>
                      <TabsContent value="monitoring" className="m-0 h-full"><CaseListTable cases={monitoringCases} isEspecialista={true} emptyMessage="Nenhum caso em monitoramento." /></TabsContent>
                   </div>
                </CardContent>
              </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}