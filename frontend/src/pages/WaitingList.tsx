import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { differenceInDays } from 'date-fns'
import { Loader2, AlertTriangle, UserPlus, CalendarClock } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/Pagination' // Usa o componente que você enviou

import { ROUTES } from '@/constants/routes'
import { getUrgencyColor } from '@/constants/caseConstants'

export function WaitingList() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page') ?? '1') // Captura página da URL
  
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState("")

  // [PAGINAÇÃO] Query otimizada
  const { data: result, isLoading } = useQuery({
    queryKey: ['cases', 'waiting-list', currentPage],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { 
          status: 'AGUARDANDO_DISTRIBUICAO_PAEFI', 
          pageSize: 10, // Limite seguro
          page: currentPage,
          view: 'all',
          sortBy: 'pesoUrgencia', 
          sortOrder: 'desc'
        } 
      })
      // Garante estrutura { items, meta }
      const items = res.data.data || res.data.items || []
      const meta = res.data.meta || { total: items.length, page: currentPage, pageSize: 10, totalPages: 1 }
      return { items, meta }
    },
    // keepPreviousData: true // (Opcional: melhora UX na troca de página)
  })

  // ... (Query de especialistas e mutation mantidos iguais)
  const { data: specialists = [] } = useQuery({
    queryKey: ['users', 'specialists'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { cargo: 'Especialista', active: true }})
      return res.data
    },
    enabled: isAssignOpen
  })

  const { mutate: assignSpecialist, isPending: isAssigning } = useMutation({
    mutationFn: async () => {
      if (!selectedCaseId) return
      await api.patch(`/cases/${selectedCaseId}/assign`, { specialistId: selectedSpecialist })
    },
    onSuccess: () => {
      toast.success("Técnico atribuído com sucesso.")
      setIsAssignOpen(false)
      setSelectedCaseId(null)
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
    onError: () => toast.error("Erro ao atribuir técnico.")
  })

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev })
  }

  const cases = result?.items || []
  const meta = result?.meta

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-500 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" /> Fila de Espera PAEFI
        </h1>
        <p className="text-muted-foreground">Monitoramento de casos aguardando vinculação técnica.</p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            Demanda Reprimida
          </CardTitle>
          <CardDescription>
            {meta?.total || 0} famílias aguardam atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Nome / CPF</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Tempo de Espera</TableHead>
                    <TableHead>Violação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin mx-auto text-amber-600"/></TableCell></TableRow>}
                  {!isLoading && cases.length === 0 && <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Fila zerada!</TableCell></TableRow>}
                  
                  {cases.map((c: any) => {
                    const daysWaiting = differenceInDays(new Date(), new Date(c.dataEntrada))
                    const isCriticalDelay = daysWaiting > 30
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link to={ROUTES.CASE_DETAIL(c.id)} className="font-medium hover:underline text-primary block">{c.nomeCompleto}</Link>
                          <span className="text-xs text-muted-foreground font-mono">{c.cpf}</span>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={`${getUrgencyColor(c.urgencia)} border`}>{c.urgencia}</Badge></TableCell>
                        <TableCell>
                          <div className={`font-mono font-bold ${isCriticalDelay ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{daysWaiting} dias</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={c.violacao}>{c.violacao}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => { setSelectedCaseId(c.id); setIsAssignOpen(true); }}><UserPlus className="h-4 w-4 mr-1" /> Atribuir</Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Paginação da Fila de Espera */}
            {meta && meta.totalPages > 1 && (
              <Pagination 
                currentPage={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                pageSize={meta.pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de Atribuição (Mantido) */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribuir Caso</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Selecione o Especialista Responsável</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger><SelectValue placeholder="Selecione um técnico..." /></SelectTrigger>
              <SelectContent>
                {specialists.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              O caso será movido para "Acolhida Especializada" automaticamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignSpecialist()} disabled={!selectedSpecialist || isAssigning}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}