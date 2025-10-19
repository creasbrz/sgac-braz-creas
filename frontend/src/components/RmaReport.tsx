// frontend/src/components/RmaReport.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'

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
}

export function RmaReport() {
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'yyyy-MM'),
  )
  const [isQueryEnabled, setIsQueryEnabled] = useState(false)

  const {
    data: rmaData,
    isLoading,
    isError,
    refetch,
  } = useQuery<RmaData>({
    queryKey: ['rmaReport', selectedMonth],
    queryFn: async () => {
      setIsQueryEnabled(true)
      const response = await api.get('/reports/rma', {
        params: { month: selectedMonth },
      })
      return response.data
    },
    enabled: false, // Só executa a query ao clicar no botão
  })

  const handleGenerateReport = () => {
    refetch()
  }

  const monthName = format(new Date(`${selectedMonth}-02`), 'MMMM de yyyy', {
    locale: ptBR,
  })

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Geração do RMA (Relatório Mensal)</CardTitle>
        <CardDescription>
          Selecione o mês de referência para gerar os dados consolidados do PAEFI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2 flex-1">
            <Label htmlFor="month">Mês de Referência</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
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

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isError && (
          <p className="text-destructive text-center py-10">
            Ocorreu um erro ao gerar o relatório.
          </p>
        )}
        {rmaData && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg">
              Resultado do RMA para {monthName}
            </h3>
            
            {/* Bloco B: Volume de Atendimentos */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador (Bloco B)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>B1. Famílias/Indivíduos em acompanhamento no início do mês</TableCell>
                  <TableCell className="text-right font-bold">{rmaData.initialCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>B2. Novas Famílias/Indivíduos inseridos no mês</TableCell>
                  <TableCell className="text-right font-bold">{rmaData.newEntries}</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>B3. Famílias/Indivíduos desligados no mês</TableCell>
                  <TableCell className="text-right font-bold">{rmaData.closedCases}</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>B4. Total em acompanhamento no final do mês (B1+B2-B3)</TableCell>
                  <TableCell className="text-right font-bold">{rmaData.finalCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {/* Bloco C: Perfil */}
            <h4 className="font-semibold pt-4">C1. Perfil dos Novos Casos por Sexo</h4>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sexo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Masculino</TableCell>
                  <TableCell className="text-right">{rmaData.profileBySex.masculino}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Feminino</TableCell>
                  <TableCell className="text-right">{rmaData.profileBySex.feminino}</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>Outro</TableCell>
                  <TableCell className="text-right">{rmaData.profileBySex.outro}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}