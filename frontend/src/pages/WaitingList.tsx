// frontend/src/pages/WaitingList.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { differenceInDays } from 'date-fns'
import { Loader2, AlertTriangle, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { ROUTES } from '@/constants/routes'
import { getUrgencyColor } from '@/constants/caseConstants'

export function WaitingList() {
  const queryClient = useQueryClient()
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState("")

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['cases', 'waiting-list'],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { status: 'AGUARDANDO_DISTRIBUICAO_PAEFI', pageSize: 100 } 
      })
      return res.data.items || []
    }
  })

  const { data: specialists = [] } = useQuery({
    queryKey: ['users', 'specialists'],
    queryFn: async () => {
      const res = await api.get('/users')
      return res.data.filter((u: any) => u.cargo === 'Especialista')
    },
    enabled: isAssignOpen
  })

  const { mutate: assignSpecialist, isPending: isAssigning } = useMutation({
    mutationFn: async () => {
      if (!selectedCaseId) return
      await api.patch(`/cases/${selectedCaseId}/assign`, { specialistId: selectedSpecialist })
    },
    onSuccess: () => {
      toast.success("Técnico atribuído.")
      setIsAssignOpen(false)
      setSelectedCaseId(null)
      queryClient.invalidateQueries({ queryKey: ['cases', 'waiting-list'] })
    },
    onError: () => toast.error("Erro ao atribuir.")
  })

  const sortedCases = casesData?.sort((a: any, b: any) => {
     if (b.pesoUrgencia !== a.pesoUrgencia) return b.pesoUrgencia - a.pesoUrgencia
     return new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime()
  }) || []

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-700 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" /> Fila de Espera PAEFI
        </h1>
        <p className="text-muted-foreground">Monitoramento de casos aguardando vinculação técnica.</p>
      </div>

      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle>Demanda Reprimida</CardTitle>
          <CardDescription>
            {sortedCases.length} famílias aguardam atendimento especializado.
            <br/>Priorize os casos com maior tempo de espera e urgência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                {/* [CORREÇÃO] Ordem das colunas ajustada */}
                <TableRow>
                  <TableHead className="w-[300px]">Nome / CPF</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Tempo de Espera</TableHead>
                  <TableHead>Violação</TableHead> {/* [CORREÇÃO] Renomeado de Demanda para Violação */}
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
                {!isLoading && sortedCases.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Fila zerada! Bom trabalho.</TableCell></TableRow>
                )}
                {sortedCases.map((c: any) => {
                  const daysWaiting = differenceInDays(new Date(), new Date(c.dataEntrada))
                  const isCriticalDelay = daysWaiting > 30

                  return (
                    <TableRow key={c.id}>
                      {/* Coluna 1: Nome/CPF */}
                      <TableCell>
                        <Link to={ROUTES.CASE_DETAIL(c.id)} className="font-medium hover:underline text-primary block">
                          {c.nomeCompleto}
                        </Link>
                        <span className="text-xs text-muted-foreground">{c.cpf}</span>
                      </TableCell>
                      
                      {/* Coluna 2: Prioridade */}
                      <TableCell>
                        <Badge variant="outline" className={`${getUrgencyColor(c.urgencia)} border`}>
                          {c.urgencia}
                        </Badge>
                      </TableCell>
                      
                      {/* Coluna 3: Tempo */}
                      <TableCell>
                        <div className={`font-mono font-bold ${isCriticalDelay ? 'text-red-600' : 'text-foreground'}`}>
                          {daysWaiting} dias
                        </div>
                        <span className="text-[10px] text-muted-foreground">desde {new Date(c.dataEntrada).toLocaleDateString()}</span>
                      </TableCell>
                      
                      {/* Coluna 4: Violação */}
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {c.violacao}
                      </TableCell>
                      
                      {/* Coluna 5: Ação */}
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => { setSelectedCaseId(c.id); setIsAssignOpen(true); }}>
                          <UserPlus className="h-4 w-4 mr-1" /> Atribuir
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Distribuir Caso</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Selecione o Especialista Responsável</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {specialists.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignSpecialist()} disabled={!selectedSpecialist || isAssigning}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}