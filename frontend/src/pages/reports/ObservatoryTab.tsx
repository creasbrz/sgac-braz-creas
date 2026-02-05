// frontend/src/pages/reports/ObservatoryTab.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { MapPoint } from '@/components/analytics/TerritoryMap'
import type { ObservatoryData, UrgencyStatData } from '@/types/case'

// Seções Modulares
import { OverviewSection } from '@/components/analytics/sections/OverviewSection'
import { NetworkSection } from '@/components/analytics/sections/NetworkSection'
import { PerformanceSection } from '@/components/analytics/sections/PerformanceSection'
import { SocialSection } from '@/components/analytics/sections/SocialSection'
import { TerritorySection } from '@/components/analytics/sections/TerritorySection'

// PDF Export
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { ObservatoryDoc } from '@/components/reports/templates/ObservatoryDoc'

export function ObservatoryTab() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ObservatoryData & { mapData: MapPoint[] }>({
    queryKey: ['vigilancia'],
    queryFn: async () => {
      const res = await api.get('/stats/vigilancia')
      const rawData = res.data

      // Sanitização de Dados (Data Guard)
      const sanitizedData: ObservatoryData & { mapData: MapPoint[] } = {
        ...rawData,
        collectiveData: {
          totalGroups: rawData.collectiveData?.totalGroups || 0,
          totalParticipants: rawData.collectiveData?.totalParticipants || 0,
          avgAttendance: rawData.collectiveData?.avgAttendance || 0,
        },
        efficiencyData: {
          avgPermanence: rawData.efficiencyData?.avgPermanence || 0,
          avgWaitTime: rawData.efficiencyData?.avgWaitTime || 0,
          retentionRate: rawData.efficiencyData?.retentionRate || 0,
          totalClosed: rawData.efficiencyData?.totalClosed || 0,
        },
        urgencyData: (rawData.urgencyData || []).map((u: any): UrgencyStatData => ({
          name: u.name,
          value: u.value,
          weight: u.weight ?? 1
        })),
        mapData: rawData.mapData || [] 
      }

      return sanitizedData
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    retry: 1
  })

  // Loading State
  if (isLoading) return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between"><Skeleton className="h-10 w-48 rounded-lg"/> <Skeleton className="h-10 w-32 rounded-lg"/></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Skeleton className="h-96 rounded-xl"/>
         <Skeleton className="h-96 rounded-xl"/>
      </div>
    </div>
  )
  
  // Error State
  if (isError || !data) return (
    <div className="h-80 flex flex-col items-center justify-center border border-dashed border-status-error-border rounded-xl bg-status-error-bg/10 text-status-error-fg animate-in fade-in">
      <div className="bg-status-error-bg p-3 rounded-full mb-3 border border-status-error-border">
        <AlertTriangle className="h-8 w-8 text-status-error-fg" />
      </div>
      <h3 className="text-lg font-bold mb-1">Erro de Conexão</h3>
      <p className="text-sm opacity-80 mb-4 max-w-md text-center">
        Não foi possível sincronizar os dados do observatório.
      </p>
      <Button variant="outline" size="sm" onClick={() => refetch()} className="border-status-error-border hover:bg-status-error-bg">
        Tentar novamente
      </Button>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Toolbar Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/30 p-2 rounded-xl border border-border/40">
        <div className="flex items-center gap-3 px-2">
           <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
           </span>
           <span className="text-xs text-muted-foreground font-medium">
             Sincronizado: {format(new Date(), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
           </span>
           <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3 w-3 ${isRefetching ? 'animate-spin' : ''}`} />
           </Button>
        </div>
        
        <PDFDownloadButton 
          document={<ObservatoryDoc data={data} />}
          fileName={`Observatorio_Social_${format(new Date(), 'yyyyMMdd')}.pdf`}
          label="Exportar PDF Analítico"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto shadow-sm hover:border-primary/50 transition-colors h-9"
          icon={<Download className="mr-2 h-4 w-4" />}
        />
      </div>

      {/* Navegação por Abas */}
      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex justify-center">
            <TabsList className="inline-grid w-full sm:w-auto grid-cols-2 sm:grid-cols-5 bg-muted/40 p-1 rounded-xl h-auto gap-1 border border-border/40">
            <TabsTrigger value="overview" className="data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:shadow-sm">Rede</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:shadow-sm">Atendimentos</TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:shadow-sm">Perfil Social</TabsTrigger>
            <TabsTrigger value="territory" className="data-[state=active]:shadow-sm">Território</TabsTrigger>
            </TabsList>
        </div>

        {/* Conteúdo das Abas (Lazy loaded) */}
        <div className="min-h-125">
          <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
            <OverviewSection data={data} />
          </TabsContent>

          <TabsContent value="network" className="mt-0 focus-visible:outline-none">
            <NetworkSection data={data} />
          </TabsContent>

          <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
            <PerformanceSection data={data} />
          </TabsContent>

          <TabsContent value="social" className="mt-0 focus-visible:outline-none">
            <SocialSection data={data} />
          </TabsContent>

          <TabsContent value="territory" className="mt-0 focus-visible:outline-none">
            <TerritorySection mapData={data.mapData} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}