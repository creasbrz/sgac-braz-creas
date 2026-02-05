// frontend/src/pages/reports/RmaTab.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, FileText, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
// [CORREÇÃO] Removido 'cn' que não estava sendo usado

// Imports de PDF e Tipos
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { RmaDoc } from '@/components/reports/templates/RmaDoc'
import type { RmaReportData } from '@/types/case'

export function RmaTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  
  // Query para buscar dados do RMA
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<RmaReportData>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/rma/generate', { params: { month, year } })
      
      return {
        ...res.data,
        periodo: format(new Date(selectedMonth + '-02'), 'MM/yyyy')
      };
    },
    enabled: false // Só busca ao clicar em "Gerar"
  })

  // [CORREÇÃO] Cálculo seguro do total de atendimentos (soma das subcategorias do Bloco 2)
  const totalAtendimentos = data?.bloco2 
    ? (data.bloco2.m1_individual || 0) + (data.bloco2.m2_grupo || 0) + (data.bloco2.m3_cras || 0) + (data.bloco2.m4_visitas || 0)
    : 0;

  return (
    <div className="flex flex-col items-center justify-start py-8 animate-in fade-in duration-500">
      
      <Card className="w-full max-w-2xl shadow-sm border-border/60 bg-card overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-muted/20 pb-6">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-status-info-bg border border-status-info-border rounded-xl">
                <FileText className="h-6 w-6 text-status-info-fg" />
             </div>
             <div>
                <CardTitle className="text-lg font-bold">Emissão do RMA</CardTitle>
                <CardDescription>
                    Registro Mensal de Atendimentos (Modelo Oficial SUAS).
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 p-6 md:p-8">
          {/* Controles de Geração */}
          <div className="grid gap-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1 w-full">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Mês de Referência</label>
                    <Input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)} 
                        className="h-11 bg-background"
                    />
                </div>
                <Button 
                    onClick={() => refetch()} 
                    disabled={isLoading || isRefetching} 
                    // [CORREÇÃO] min-w-[140px] -> min-w-35 (Tailwind v4)
                    className="h-11 min-w-35 font-semibold shadow-sm"
                >
                    {(isLoading || isRefetching) ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                    Gerar Dados
                </Button>
            </div>
          </div>

          {/* Feedback de Erro */}
          {isError && (
            <div className="p-4 rounded-xl border border-status-error-border bg-status-error-bg flex items-start gap-3 animate-in shake">
              <AlertTriangle className="h-5 w-5 text-status-error-fg shrink-0 mt-0.5" />
              <div>
                 <h4 className="text-sm font-bold text-status-error-fg">Falha na Geração</h4>
                 <p className="text-sm text-status-error-fg/80 mt-1">
                    Ocorreu um erro ao processar os dados do RMA. Verifique a conexão e tente novamente.
                 </p>
              </div>
            </div>
          )}

          {/* Área de Sucesso e Download */}
          {data && !isLoading && !isRefetching && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-status-success-bg/40 border border-status-success-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-full bg-status-success-bg flex items-center justify-center border border-status-success-border shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-status-success-fg" />
                   </div>
                   <div>
                      <p className="font-bold text-foreground">Relatório Pronto</p>
                      <p className="text-sm text-muted-foreground">
                        Referência: <span className="font-medium text-foreground">{data.periodo}</span>
                      </p>
                   </div>
                </div>
                
                <div className="w-full sm:w-auto">
                   <PDFDownloadButton 
                    document={<RmaDoc data={data} />}
                    fileName={`RMA_CREAS_${selectedMonth}.pdf`}
                    label="Baixar PDF Oficial"
                    variant="default"
                    size="lg"
                    className="w-full shadow-md hover:shadow-lg transition-all"
                    icon={<Download className="mr-2 h-4 w-4" />}
                  />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                 <div className="p-3 rounded-lg border border-border/50 bg-muted/10">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Famílias Acomp.</span>
                    {/* [CORREÇÃO] Acesso à propriedade correta 'a1_total_acompanhamento' */}
                    <p className="text-2xl font-bold text-foreground mt-1">{data.bloco1?.a1_total_acompanhamento || 0}</p>
                 </div>
                 <div className="p-3 rounded-lg border border-border/50 bg-muted/10">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Atendimentos</span>
                    {/* [CORREÇÃO] Uso da variável calculada 'totalAtendimentos' */}
                    <p className="text-2xl font-bold text-foreground mt-1">{totalAtendimentos}</p>
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <p className="mt-8 text-center text-xs text-muted-foreground max-w-md px-4 leading-relaxed">
        O RMA consolida os dados de atendimentos, acompanhamentos e perfil dos usuários (novos casos) para envio ao sistema do governo federal.
      </p>
    </div>
  )
}