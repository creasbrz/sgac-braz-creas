import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts'
import { Briefcase, Activity, Download } from 'lucide-react'
import { toast } from 'sonner'

// Import do Gerador
import { generateManagementPDF, type ManagementReportData } from '@/utils/pdfGenerator'

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

  // Lógica de Exportação
  const handleExport = () => {
    if (!workloadData) {
      toast.warning("Aguarde o carregamento dos dados.")
      return
    }

    try {
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

      const pdfData: ManagementReportData = {
        periodo: format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }),
        stats: {
          ativos: totalAtivos,
          acolhidas: totalAcolhida,
          paefi: totalPaefi,
          novos: 0, // Dado não disponível neste endpoint (snapshot), ajustável se tiver API
          desligados: 0 
        },
        cargaHoraria: {
          agentes,
          especialistas
        }
      }

      generateManagementPDF(pdfData)
      toast.success("Relatório de equipe gerado com sucesso!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao gerar PDF.")
    }
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-64"/><Skeleton className="h-64"/></div>

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2">
      
      {/* Cabeçalho com Botão */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Produtividade e Carga Horária</h2>
          <p className="text-sm text-muted-foreground">Monitoramento da distribuição de casos e desempenho técnico.</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2 shadow-sm">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary"/> Fluxo de Trabalho (Últimos 3 meses)
            </CardTitle>
            <CardDescription>Casos únicos movimentados por técnico.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData || []} layout="vertical" margin={{ left: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false}/>
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}}/>
                   <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Casos Movimentados" />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de Carga Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary"/> Carga de Trabalho Atual
            </CardTitle>
            <CardDescription>Distribuição da carteira ativa.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {workloadData?.map((user, idx) => (
                   <div key={idx} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                            {user.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            Ativos: {user.active}
                         </Badge>
                         <Badge variant="outline" className="text-muted-foreground">
                            Monit: {user.monitoring}
                         </Badge>
                      </div>
                   </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}