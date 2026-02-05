// frontend/src/pages/reports/TeamProductionTab.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList 
} from 'recharts'
import { Briefcase, Activity, Users, Download } from 'lucide-react'

import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart'

// Imports de PDF e Tipos
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { ManagementDoc } from '@/components/reports/templates/ManagementDoc'
import type { ManagementReportData } from '@/types/case'

// --- UTILS ---

interface TeamMemberWorkload {
  name: string
  role: 'Gerente' | 'Agente_Social' | 'Especialista'
  active: number
  monitoring: number
}

interface TeamPerformance {
  name: string
  value: number
}

// --- CONFIGURAÇÃO DO GRÁFICO ---
const chartConfig = {
  cases: {
    label: "Casos Movimentados",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function TeamProductionTab() {
  const { data: workloadData, isLoading: isLoadingWorkload } = useQuery<TeamMemberWorkload[]>({
    queryKey: ['productivity', 'workload'],
    queryFn: async () => (await api.get('/stats/productivity', { params: { mode: 'workload' } })).data
  })

  const { data: performanceData, isLoading: isLoadingPerformance } = useQuery<TeamPerformance[]>({
    queryKey: ['productivity', 'performance'],
    queryFn: async () => (await api.get('/stats/productivity', { params: { mode: 'performance', months: 3 } })).data
  })

  const isLoading = isLoadingWorkload || isLoadingPerformance

  // Preparação dos dados para o PDF
  const pdfData: ManagementReportData | null = (() => {
    if (!workloadData) return null;

    // Separação por cargo
    const agentes = workloadData
      .filter(u => u.role === 'Agente_Social')
      .map(u => ({ name: u.name, value: u.active }))
    
    const especialistas = workloadData
      .filter(u => u.role === 'Especialista')
      .map(u => ({ name: u.name, value: u.active }))

    // Cálculos Totais
    const totalAtivos = workloadData.reduce((acc, curr) => acc + curr.active, 0)
    const totalAcolhida = agentes.reduce((acc, curr) => acc + curr.value, 0)
    const totalPaefi = especialistas.reduce((acc, curr) => acc + curr.value, 0)

    return {
      periodo: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
      stats: {
        ativos: totalAtivos,
        acolhidas: totalAcolhida,
        paefi: totalPaefi,
        novos: 0, 
        desligados: 0 
      },
      cargaHoraria: {
        agentes,
        especialistas
      }
    }
  })();

  if (isLoading) return (
    <div className="space-y-6 p-1 animate-pulse">
        <div className="flex justify-between items-center">
           <Skeleton className="h-8 w-64" />
           <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Skeleton className="h-100 rounded-xl" />
           <Skeleton className="h-100 rounded-xl" />
        </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      
      {/* Cabeçalho com Botão */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
             <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
             </div>
             Produtividade e Carga Horária
          </h2>
          <p className="text-sm text-muted-foreground pl-1">Monitoramento da distribuição de casos e desempenho técnico.</p>
        </div>
        
        {pdfData && (
          <PDFDownloadButton 
            document={<ManagementDoc data={pdfData} />}
            fileName={`Relatorio_Equipe_${format(new Date(), 'MM-yyyy')}.pdf`}
            label="Exportar Relatório"
            variant="outline"
            size="sm"
            className="shadow-sm hover:border-primary/50 transition-colors"
            icon={<Download className="mr-2 h-4 w-4" />}
          />
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Performance */}
        <Card className="flex flex-col shadow-sm border-border/60 bg-card">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground/90">
              <Activity className="h-4 w-4 text-primary"/> Fluxo de Trabalho
            </CardTitle>
            <CardDescription className="text-xs">Casos únicos movimentados nos últimos 3 meses.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-87.5 p-6">
             <ChartContainer config={chartConfig} className="w-full h-full max-h-75">
                <BarChart 
                    accessibilityLayer
                    data={performanceData || []} 
                    layout="vertical" 
                    margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                    barCategoryGap="20%"
                >
                   <CartesianGrid horizontal={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                   <XAxis type="number" hide />
                   <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      className="font-medium text-muted-foreground"
                   />
                   <ChartTooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.3)', radius: 4}} 
                      content={<ChartTooltipContent indicator="line" />} 
                   />
                   <Bar 
                      dataKey="value" 
                      fill="var(--color-cases)" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20} 
                      name="Casos Movimentados"
                      className="opacity-90 hover:opacity-100 transition-opacity"
                   >
                      <LabelList 
                        dataKey="value" 
                        position="right" 
                        className="fill-foreground font-bold text-xs" 
                        formatter={(val: any) => val > 0 ? val : ''} 
                      />
                   </Bar>
                </BarChart>
             </ChartContainer>
          </CardContent>
        </Card>

        {/* Lista de Carga Atual */}
        <Card className="flex flex-col shadow-sm border-border/60 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground/90">
              <Briefcase className="h-4 w-4 text-primary"/> Carga de Trabalho Atual
            </CardTitle>
            <CardDescription className="text-xs">Distribuição da carteira ativa por técnico.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
             <div className="max-h-87.5 overflow-y-auto custom-scrollbar">
                {workloadData && workloadData.length > 0 ? (
                    <div className="divide-y divide-border/40">
                        {workloadData.map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                            <div className="flex items-center gap-3.5">
                                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{user.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                        {user.role.replace('_', ' ')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-status-info-bg text-status-info-fg border-status-info-border hover:bg-status-info-bg/80 h-6">
                                    Ativos: {user.active}
                                </Badge>
                                {user.monitoring > 0 && (
                                    <Badge variant="outline" className="text-muted-foreground border-border h-6">
                                        Monit: {user.monitoring}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-50 text-muted-foreground gap-2">
                        <Users className="h-8 w-8 opacity-20" />
                        <p className="text-sm">Nenhum dado de carga horária.</p>
                    </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}