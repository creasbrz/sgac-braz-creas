import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Loader2, FileText, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
      
      // Agora o backend retorna exatamente a estrutura RmaReportData completa
      // Apenas adicionamos a string de período formatada para o cabeçalho
      return {
        ...res.data,
        periodo: format(new Date(selectedMonth + '-02'), 'MM/yyyy')
      };
    },
    enabled: false // Só busca ao clicar em "Gerar"
  })

  return (
    <div className="flex flex-col items-center justify-start py-10 min-h-[60vh] animate-in fade-in duration-500">
      
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Emissão do RMA
          </CardTitle>
          <CardDescription>
            Registro Mensal de Atendimentos (Modelo Oficial Completo).
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Controles */}
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Mês de Referência</label>
              <div className="flex gap-2">
                <Input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                  className="flex-1"
                />
                <Button onClick={() => refetch()} disabled={isLoading || isRefetching} className="min-w-[100px]">
                  {(isLoading || isRefetching) ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null}
                  Gerar
                </Button>
              </div>
            </div>
          </div>

          {/* Feedback de Erro */}
          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ocorreu um erro ao gerar os dados do RMA. Verifique a conexão e tente novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Área de Download */}
          {data && !isLoading && !isRefetching && (
            <div className="pt-4 border-t animate-in slide-in-from-top-2">
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-center space-y-4">
                <div>
                  <p className="font-semibold text-sm">Relatório Gerado com Sucesso</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Referência: {data.periodo}
                  </p>
                </div>
                
                <div className="flex justify-center w-full">
                   <PDFDownloadButton 
                    document={<RmaDoc data={data} />}
                    fileName={`RMA_CREAS_${selectedMonth}.pdf`}
                    label="Baixar PDF Oficial"
                    variant="default"
                    size="default"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Auxiliar */}
      <p className="mt-8 text-center text-xs text-muted-foreground max-w-md px-4">
        O RMA consolida os dados de atendimentos, acompanhamentos e perfil dos usuários (novos casos).
      </p>
    </div>
  )
}