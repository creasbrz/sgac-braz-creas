import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Loader2, Download, CheckCircle2, Calendar, 
  FileText, Users, ArrowRight, ArrowLeft, Activity 
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// [NOVO] Importação do gerador de PDF e tipagem
import { generateRmaPDF, type RmaReportData } from '@/utils/pdfGenerator'

interface RmaData {
  initialCount: number
  newEntries: number
  closedCases: number
  finalCount: number
  profileBySex: { masculino: number; feminino: number; outro: number }
  profileByAgeGroup: Record<string, number>
  // Sugestão: Adicione bloco2 e bloco3 na API futuramente
}

export function RmaTab() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const { data: rmaData, isLoading, refetch, isFetched } = useQuery<RmaData>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      const response = await api.get('/reports/rma', { params: { month: selectedMonth } })
      return response.data
    },
    enabled: false,
  })

  // Formatação de data para exibição
  const [year, month] = selectedMonth.split('-').map(Number)
  const monthDate = new Date(year, (month ?? 1) - 1, 1)
  const monthName = format(monthDate, 'MMMM \'de\' yyyy', { locale: ptBR })

  const handleGenerateReport = async () => {
    if (!selectedMonth) {
      toast.warning("Selecione um mês válido.")
      return
    }
    const result = await refetch()
    if (result.isError) toast.error("Falha ao buscar dados.")
    if (result.isSuccess) toast.success("Dados carregados com sucesso.")
  }

  // [NOVO] Função para estruturar e baixar o PDF
  const handleExportPdf = () => {
    if (!rmaData) return

    // Mapeamento: Transforma os dados da tela no formato exigido pelo PDF Oficial
    const pdfData: RmaReportData = {
      periodo: monthName,
      bloco1: {
        familiasAcompPaefi: rmaData.initialCount, // Aproximação: Saldo inicial
        novosCasos: rmaData.newEntries,
        desligamentos: rmaData.closedCases
      },
      // TODO: Conectar estes campos com a API quando o backend estiver pronto
      bloco2: {
        totalAtendimentos: 0, 
        visitasDomiciliares: 0,
        abordagensRua: 0
      },
      bloco3: {
        violenciaFisica: 0,
        violenciaPsicologica: 0,
        negligencia: 0,
        abusoSexual: 0
      }
    }

    try {
      generateRmaPDF(pdfData)
      toast.success("PDF do RMA gerado!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao gerar PDF.")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. ÁREA DE CONTROLE (SELEÇÃO) */}
      <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-xl border bg-card shadow-sm">
        <div className="space-y-2 flex-1 w-full sm:w-auto">
          <Label htmlFor="month" className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Período de Referência
          </Label>
          <Input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-background font-medium"
          />
        </div>
        <Button 
          onClick={handleGenerateReport} 
          disabled={isLoading} 
          className="w-full sm:w-auto min-w-[180px] shadow-sm"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Carregar Dados
        </Button>
      </div>

      {/* LOADING STATE */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground animate-pulse">Consolidando indicadores do SUAS...</p>
        </div>
      )}
      
      {/* EMPTY STATE */}
      {!isLoading && !rmaData && !isFetched && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
           <div className="p-4 rounded-full bg-muted/20 mb-3">
             <FileText className="h-8 w-8 text-muted-foreground/50" />
           </div>
           <h3 className="font-semibold text-lg">Nenhum relatório carregado</h3>
           <p className="text-sm text-muted-foreground max-w-sm mt-1">
             Selecione o mês acima e clique em "Carregar Dados" para visualizar os indicadores.
           </p>
        </div>
      )}

      {/* REPORT CONTENT */}
      {rmaData && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* HEADER DO RELATÓRIO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
             <div>
               <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                 RMA Consolidado <Badge variant="outline" className="text-base font-normal capitalize px-3 py-0.5">{monthName}</Badge>
               </h2>
               <p className="text-sm text-muted-foreground mt-1">Dados oficiais para preenchimento do sistema SUASWeb.</p>
             </div>
             
             {/* [NOVO] Botão de Exportação conectado */}
             <Button variant="outline" className="gap-2" onClick={handleExportPdf}>
                <Download className="h-4 w-4"/> Baixar PDF Oficial
             </Button>
          </div>

          {/* KPI CARDS (RESUMO RÁPIDO) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/10 border-l-4 border-l-slate-400">
              <CardContent className="p-4 pt-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saldo Anterior</p>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">{rmaData.initialCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500">
              <CardContent className="p-4 pt-5">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowRight className="h-3 w-3"/> Entradas
                </p>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">+{rmaData.newEntries}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-500">
              <CardContent className="p-4 pt-5">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3"/> Saídas
                </p>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">-{rmaData.closedCases}</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-4 pt-5">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3"/> Saldo Final
                </p>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{rmaData.finalCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* BLOCO B: MOVIMENTAÇÃO */}
          <Card className="border shadow-sm overflow-hidden">
             <CardHeader className="bg-muted/30 border-b pb-3">
               <CardTitle className="text-base font-bold flex items-center gap-2">
                 <Activity className="h-5 w-5 text-primary"/> 
                 BLOCO I: Movimentação de Usuários
               </CardTitle>
               <CardDescription>Volume de fluxo de famílias no serviço.</CardDescription>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableHead className="w-[80px] text-center font-bold">Cód.</TableHead>
                      <TableHead>Descrição do Indicador</TableHead>
                      <TableHead className="text-right pr-6">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">B.1</TableCell>
                      <TableCell>Famílias/Indivíduos em acompanhamento no início do mês</TableCell>
                      <TableCell className="text-right font-medium pr-6">{rmaData.initialCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">B.2</TableCell>
                      <TableCell>Novos inseridos no acompanhamento no mês</TableCell>
                      <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400 pr-6">+{rmaData.newEntries}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">B.3</TableCell>
                      <TableCell>Desligados do acompanhamento no mês</TableCell>
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400 pr-6">-{rmaData.closedCases}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-semibold border-t-2 border-t-muted">
                      <TableCell className="text-center font-mono text-xs">B.4</TableCell>
                      <TableCell>Total de famílias/indivíduos no final do mês (B1 + B2 - B3)</TableCell>
                      <TableCell className="text-right text-lg pr-6">{rmaData.finalCount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
             </CardContent>
          </Card>

          {/* BLOCO C: PERFIL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* C1 - SEXO */}
            <Card className="border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary"/> Perfil por Sexo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium pl-6">Masculino</TableCell>
                      <TableCell className="text-right font-bold pr-6">{rmaData.profileBySex.masculino}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium pl-6">Feminino</TableCell>
                      <TableCell className="text-right font-bold pr-6">{rmaData.profileBySex.feminino}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium pl-6">Outro / Não Informado</TableCell>
                      <TableCell className="text-right font-bold pr-6">{rmaData.profileBySex.outro}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 border-t">
                      <TableCell className="font-bold pl-6">Total</TableCell>
                      <TableCell className="text-right font-bold pr-6">
                        {rmaData.profileBySex.masculino + rmaData.profileBySex.feminino + rmaData.profileBySex.outro}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* C2 - IDADE */}
            <Card className="border shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-muted/30 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary"/> Faixa Etária
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {Object.entries(rmaData.profileByAgeGroup).map(([range, value], idx) => (
                      <TableRow key={range} className={idx % 2 === 0 ? "bg-background" : "bg-muted/5"}>
                        <TableCell className="pl-6 text-muted-foreground">
                          {range.replace('-', ' a ').replace('+', ' anos ou mais').replace('0-6', '0 a 6 anos')}
                        </TableCell>
                        <TableCell className="text-right font-bold pr-6">{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
        </div>
      )}
    </div>
  )
}