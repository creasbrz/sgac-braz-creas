// frontend/src/pages/reports/ObservatoryTab.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Download, AlertTriangle } from 'lucide-react'
import { generateObservatoryPDF, type ObservatoryData } from '@/utils/pdfGenerator'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { MapPoint } from '@/components/analytics/TerritoryMap'

// Importando as Seções Isoladas
import { OverviewSection } from '@/components/analytics/sections/OverviewSection'
import { NetworkSection } from '@/components/analytics/sections/NetworkSection'
import { PerformanceSection } from '@/components/analytics/sections/PerformanceSection'
import { SocialSection } from '@/components/analytics/sections/SocialSection'
import { TerritorySection } from '@/components/analytics/sections/TerritorySection'

export function ObservatoryTab() {
  const { data, isLoading, isError } = useQuery<ObservatoryData & { mapData: MapPoint[] }>({
    queryKey: ['vigilancia'],
    queryFn: async () => {
      const res = await api.get('/stats/vigilancia')
      return res.data
    },
    staleTime: 1000 * 60 * 5,
    retry: 1
  })

  const handleDownloadPDF = () => {
    if (!data) return
    generateObservatoryPDF(data)
  }

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex justify-end"><Skeleton className="h-10 w-48"/></div>
      <Skeleton className="h-12 w-full"/>
      <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64"/><Skeleton className="h-64"/></div>
    </div>
  )
  
  if (isError || !data) return (
    <div className="p-8 text-center text-destructive border rounded-md bg-destructive/10 flex flex-col items-center">
      <AlertTriangle className="mb-2 h-8 w-8" />
      <span className="font-semibold">Erro ao carregar dados do observatório.</span>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Toolbar */}
      <div className="flex justify-end bg-muted/20 p-2 rounded-lg border border-border/50">
        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2 border-slate-300 dark:border-slate-700 bg-background hover:bg-muted">
          <Download className="h-4 w-4" /> Exportar PDF do Observatório
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-muted/50 p-1 h-auto gap-1">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="network">Rede</TabsTrigger>
          <TabsTrigger value="performance">Atendimentos</TabsTrigger>
          <TabsTrigger value="social">Perfil Social</TabsTrigger>
          <TabsTrigger value="territory">Território</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewSection data={data} />
        </TabsContent>

        <TabsContent value="network">
          <NetworkSection data={data} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceSection data={data} />
        </TabsContent>

        <TabsContent value="social">
          <SocialSection data={data} />
        </TabsContent>

        <TabsContent value="territory">
          <TerritorySection mapData={data.mapData || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}