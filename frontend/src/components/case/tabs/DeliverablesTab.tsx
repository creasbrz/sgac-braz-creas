// frontend/src/components/case/tabs/DeliverablesTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { PackageCheck, Plus, Loader2, Clock, CheckCircle2, XCircle, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { ServiceDeliverable } from '@/types/case'

// Lista de benefícios baseada na documentação do CREAS
const TIPOS_ENTREGA = [
  'Prato Cheio', 'BPC', 'Auxílio Natalidade', 'Auxílio por Morte', 
  'CNH Social', 'Carteira do Idoso', 'Isenção de RG', 'Cesta de Alimentos',
  'Declaração de Hipossuficiência', 'Kit Enxoval'
]

export function DeliverablesTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('')

  const { data: items = [], isLoading } = useQuery<ServiceDeliverable[]>({
    queryKey: ['deliverables', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/deliverables`)).data
  })

  const { mutate: createItem, isPending } = useMutation({
    mutationFn: async () => api.post(`/cases/${caseId}/deliverables`, { tipo: selectedType }),
    onSuccess: () => {
      toast.success('Solicitação registrada!')
      setIsAddOpen(false)
      setSelectedType('')
      queryClient.invalidateQueries({ queryKey: ['deliverables', caseId] })
    }
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => 
      api.patch(`/deliverables/${id}`, { status, dataEntrega: status === 'ENTREGUE' ? new Date().toISOString() : undefined }),
    onSuccess: () => {
      toast.success('Status atualizado.')
      queryClient.invalidateQueries({ queryKey: ['deliverables', caseId] })
    }
  })

  const getStatusBadge = (status: string) => {
    const map: any = {
      'SOLICITADO': { color: 'bg-amber-100 text-amber-700', icon: Clock },
      'CONCEDIDO': { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
      'ENTREGUE': { color: 'bg-emerald-100 text-emerald-700', icon: Truck },
      'NEGADO': { color: 'bg-red-100 text-red-700', icon: XCircle },
    }
    const cfg = map[status] || map['SOLICITADO']
    const Icon = cfg.icon
    return <Badge variant="outline" className={`${cfg.color} flex items-center gap-1 border-0`}> <Icon className="h-3 w-3"/> {status} </Badge>
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" /> Entregas e Benefícios
          </h3>
          <p className="text-sm text-muted-foreground">Gestão de benefícios eventuais e documentação.</p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Solicitação
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading && <div className="text-center py-4"><Loader2 className="animate-spin h-6 w-6 mx-auto"/></div>}
        
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{item.tipo}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Solicitado em {format(new Date(item.dataSolicitacao), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <span>•</span>
                  <span>Por: {item.responsavel.nome}</span>
                  {item.dataEntrega && <span className="text-emerald-600">• Entregue em {format(new Date(item.dataEntrega), "dd/MM")}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {getStatusBadge(item.status)}
                
                {item.status !== 'ENTREGUE' && (
                  <Select onValueChange={(val) => updateStatus({ id: item.id, status: val })}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Alterar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLICITADO">Solicitado</SelectItem>
                      <SelectItem value="CONCEDIDO">Concedido</SelectItem>
                      <SelectItem value="ENTREGUE">Entregue</SelectItem>
                      <SelectItem value="NEGADO">Negado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
            Nenhuma entrega registrada.
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Benefício/Documento</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {TIPOS_ENTREGA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => createItem()} disabled={!selectedType || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}