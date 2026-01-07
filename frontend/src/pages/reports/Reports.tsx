import { useState } from 'react'
import { FileText, BarChart3, Users, ClipboardList, PieChart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RmaTab } from './RmaTab'
import { ObservatoryTab } from './ObservatoryTab'
import { TeamProductionTab } from './TeamProductionTab'
import { DismissalAnalytics } from './DismissalAnalytics' // [NOVO] Importação do relatório
import { cn } from '@/lib/utils'

export function Reports() {
  const [activeTab, setActiveTab] = useState("rma")

  // Classe utilitária para os gatilhos das abas (DRY)
  const tabTriggerClass = cn(
    "flex items-center gap-2 transition-all",
    "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm",
    "hover:text-foreground/80"
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <ClipboardList className="h-8 w-8 text-primary" /> 
            Relatórios & RMA
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Gestão de indicadores, produção da equipe e conformidade SUAS.
          </p>
        </div>
      </div>

      <Tabs defaultValue="rma" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        
        {/* NAVEGAÇÃO (TABS) */}
        <div className="flex justify-center md:justify-start">
          {/* [AJUSTE] Grid adaptado para 4 abas (2x2 no mobile, 4x1 no desktop) */}
          <TabsList className="grid w-full md:w-[850px] grid-cols-2 md:grid-cols-4 bg-muted/60 p-1 rounded-lg shadow-inner h-auto">
            <TabsTrigger value="rma" className={tabTriggerClass}>
              <FileText className="h-4 w-4"/> 
              <span className="hidden sm:inline">RMA Oficial</span>
              <span className="sm:hidden">RMA</span>
            </TabsTrigger>
            
            <TabsTrigger value="team" className={tabTriggerClass}>
              <Users className="h-4 w-4"/> 
              <span className="hidden sm:inline">Produção Equipe</span>
              <span className="sm:hidden">Equipe</span>
            </TabsTrigger>
            
            <TabsTrigger value="observatory" className={tabTriggerClass}>
              <BarChart3 className="h-4 w-4"/> 
              <span className="hidden sm:inline">Observatório</span>
              <span className="sm:hidden">Obs.</span>
            </TabsTrigger>

            {/* [NOVO] Aba de Desligamentos */}
            <TabsTrigger value="dismissals" className={tabTriggerClass}>
              <PieChart className="h-4 w-4"/> 
              <span className="hidden sm:inline">Desligamentos</span>
              <span className="sm:hidden">Saídas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <TabsContent value="rma" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
          <RmaTab />
        </TabsContent>

        <TabsContent value="team" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
          <TeamProductionTab />
        </TabsContent>

        <TabsContent value="observatory" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
          <ObservatoryTab />
        </TabsContent>

        {/* [NOVO] Conteúdo de Desligamentos */}
        <TabsContent value="dismissals" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
          <DismissalAnalytics />
        </TabsContent>

      </Tabs>
    </div>
  )
}