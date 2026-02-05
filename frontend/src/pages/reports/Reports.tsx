// frontend/src/pages/reports/Reports.tsx
import { useState } from 'react'
import { FileText, BarChart3, Users, ClipboardList, PieChart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RmaTab } from './RmaTab'
import { ObservatoryTab } from './ObservatoryTab'
import { TeamProductionTab } from './TeamProductionTab'
import { DismissalAnalytics } from './DismissalAnalytics'
import { cn } from '@/lib/utils'

export function Reports() {
  const [activeTab, setActiveTab] = useState("rma")

  // Estilo base para os gatilhos das abas
  const tabTriggerClass = cn(
    "flex items-center gap-2 transition-all duration-300",
    "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium",
    "hover:text-foreground/80 text-muted-foreground"
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 p-4 md:p-8 max-w-400 mx-auto">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
               <ClipboardList className="h-6 w-6 text-primary" /> 
            </div>
            Relatórios & RMA
          </h1>
          <p className="text-muted-foreground text-sm md:text-base pl-1">
            Gestão de indicadores, produção da equipe e conformidade SUAS.
          </p>
        </div>
      </div>

      <Tabs defaultValue="rma" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        
        {/* NAVEGAÇÃO (TABS) */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <TabsList className="grid w-full lg:w-auto grid-cols-2 lg:grid-cols-4 bg-muted/40 p-1 rounded-xl h-auto gap-1 border border-border/40">
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

            <TabsTrigger value="dismissals" className={tabTriggerClass}>
              <PieChart className="h-4 w-4"/> 
              <span className="hidden sm:inline">Desligamentos</span>
              <span className="sm:hidden">Saídas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="min-h-125">
            <TabsContent value="rma" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
            <RmaTab />
            </TabsContent>

            <TabsContent value="team" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
            <TeamProductionTab />
            </TabsContent>

            <TabsContent value="observatory" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
            <ObservatoryTab />
            </TabsContent>

            <TabsContent value="dismissals" className="space-y-6 outline-none focus-visible:ring-0 animate-in slide-in-from-bottom-2 duration-500">
            <DismissalAnalytics />
            </TabsContent>
        </div>

      </Tabs>
    </div>
  )
}