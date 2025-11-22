// frontend/src/components/RmaReport.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RmaData {
  initialCount: number
  newEntries: number
  closedCases: number
  finalCount: number
  profileBySex: {
    masculino: number
    feminino: number
    outro: number
  }
  profileByAgeGroup: {
    '0-6': number
    '7-12': number
    '13-17': number
    '18-29': number
    '30-59': number
    '60+': number
  }
}

export function RmaReport() {
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'yyyy-MM')
  )

  const {
    data: rmaData,
    isLoading,
    isError,
    refetch,
    isFetched,
  } = useQuery<RmaData>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      const response = await api.get('/reports/rma', {
        params: { month: selectedMonth },
      })
      return response.data
    },
    enabled: false,
  })

  const handleGenerateReport = async () => {
    if (!selectedMonth) {
      toast.warning("Selecione um mês válido.")
      return
    }

    const result = await refetch()

    if (result.isError) {
      toast.error("Falha ao gerar relatório.")
    }
  }

  // Gerar data segura para nome do mês
  const [year, month] = selectedMonth.split('-').map(Number)
  const monthDate = new Date(year, (month ?? 1) - 1, 1)
  const monthName = format(monthDate, 'MMMM \'de\' yyyy', { locale: ptBR })

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Geração do RMA (Relatório Mensal)</CardTitle>
        <CardDescription>
          Selecione o mês de referência para gerar os dados consolidados do PAEFI.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Controles */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2 flex-1">
            <Label htmlFor="month">Mês de Referência</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMonth(e.target.value)}
/>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Relatório
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Erro */}
        {isError && (
          <p className="text-destructive text-center py-10">
            Ocorreu um erro ao gerar o relatório.
          </p>
        )}

        {/* Estado inicial */}
        {!isLoading && !rmaData && !isFetched && (
          <p className="text-center text-muted-foreground py-10">
            Selecione um mês e clique em <strong>Gerar Relatório</strong>.
          </p>
        )}

        {/* Relatório */}
        {rmaData && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-lg text-primary border-b pb-2">
              Resultado do RMA para {monthName}
            </h3>

            {/* Bloco B */}
            <div>
              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                Bloco B: Movimentação de Usuários
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      <TableHead className="text-right w-[100px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>B1. Em acompanhamento no início</TableCell>
                      <TableCell className="text-right font-bold">
                        {rmaData.initialCount}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>B2. Novos inseridos no mês</TableCell>
                      <TableCell className="text-right font-bold">
                        {rmaData.newEntries}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>B3. Desligados no mês</TableCell>
                      <TableCell className="text-right font-bold">
                        {rmaData.closedCases}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-medium">
                        B4. Total final (B1+B2-B3)
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {rmaData.finalCount}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Bloco C */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sexo */}
              <div>
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                  C1. Perfil por Sexo
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sexo</TableHead>
                        <TableHead className="text-right w-[80px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Masculino</TableCell>
                        <TableCell className="text-right">
                          {rmaData.profileBySex.masculino}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Feminino</TableCell>
                        <TableCell className="text-right">
                          {rmaData.profileBySex.feminino}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Outro/Não informado</TableCell>
                        <TableCell className="text-right">
                          {rmaData.profileBySex.outro}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Faixa etária */}
              <div>
                <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                  C2. Perfil por Faixa Etária
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Faixa Etária</TableHead>
                        <TableHead className="text-right w-[80px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(rmaData.profileByAgeGroup).map(([range, value]) => (
                        <TableRow key={range}>
                          <TableCell>{range.replace('-', ' a ') + (range === '60+' ? ' anos ou mais' : ' anos')}</TableCell>
                          <TableCell className="text-right">{value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
