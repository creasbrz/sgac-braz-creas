// frontend/src/components/case/tabs/ReferralsTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Network, PlusCircle, CheckCircle2, XCircle, Clock, 
  ArrowRight, ExternalLink, Loader2 
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { Referral } from '@/types/case'

interface ReferralsTabProps {
  caseId: string
}

export function ReferralsTab({ caseId }: ReferralsTabProps) {
  const queryClient = useQueryClient()
  
  // Estados para Criação
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newType, setNewType] = useState('')
  const [newInst, setNewInst] = useState('')
  const [newReason, setNewReason] = useState('')

  // Estados para Atualização (Feedback)
  const [editingRef, setEditingRef] = useState<Referral | null>(null)
  const [editStatus, setEditStatus] = useState<'PENDENTE' | 'CONCLUIDO' | 'NEGADO'>('PENDENTE')
  const [editRetorno, setEditRetorno] = useState('')

  // 1. Buscar Encaminhamentos
  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ['referrals', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/referrals`)).data
  })

  // 2. Criar Encaminhamento
  const { mutate: createReferral, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      await api.post(`/cases/${caseId}/referrals`, {
        tipo: newType,
        instituicao: newInst,
        motivo: newReason
      })
    },
    onSuccess: () => {
      toast.success("Encaminhamento registrado!")
      setIsCreateOpen(false)
      setNewType(''); setNewInst(''); setNewReason('')
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    },
    onError: () => toast.error("Erro ao registrar.")
  })

  // 3. Atualizar Encaminhamento
  const { mutate: updateReferral, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!editingRef) return
      await api.patch(`/referrals/${editingRef.id}`, {
        status: editStatus,
        retorno: editRetorno
      })
    },
    onSuccess: () => {
      toast.success("Status atualizado!")
      setEditingRef(null)
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    },
    onError: () => toast.error("Erro ao atualizar.")
  })

  // Helper para Status Badge
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONCLUIDO': return { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, text: 'Concluído' }
      case 'NEGADO': return { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Negado/Sem vaga' }
      default: return { color: 'bg-amber-100 text-amber-700', icon: Clock, text: 'Pendente' }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header da Aba */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Rede de Proteção
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestão de encaminhamentos e contra-referências.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Encaminhamento
        </Button>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {isLoading && <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}
        
        {!isLoading && referrals.length === 0 && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <Network className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhum encaminhamento registrado.</p>
          </div>
        )}

        {referrals.map((ref) => {
          const statusConfig = getStatusConfig(ref.status)
          const StatusIcon = statusConfig.icon

          return (
            <Card key={ref.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  
                  {/* Info Principal */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-semibold bg-muted/50">
                        {ref.tipo}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-bold text-foreground">{ref.instituicao}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">Motivo: </span> 
                      {ref.motivo}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span>{format(new Date(ref.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      <span>•</span>
                      <span>Por: {ref.autor?.nome}</span>
                    </div>
                  </div>

                  {/* Status e Ação */}
                  <div className="flex flex-col items-end gap-2 min-w-[140px]">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color} bg-opacity-50`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig.text}
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={() => {
                        setEditingRef(ref)
                        setEditStatus(ref.status)
                        setEditRetorno(ref.retorno || '')
                      }}
                    >
                      <ExternalLink className="mr-1.5 h-3 w-3" />
                      Atualizar/Ver
                    </Button>
                  </div>
                </div>

                {/* Contra-referência (se houver) */}
                {ref.retorno && (
                  <div className="mt-4 pt-3 border-t bg-muted/20 -mx-4 -mb-4 px-4 pb-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Contra-referência / Retorno</p>
                    <p className="text-sm text-foreground">{ref.retorno}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* --- MODAL CRIAR --- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Encaminhamento</DialogTitle>
            <DialogDescription>Registre o envio do usuário para outro serviço da rede.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue placeholder="Ex: Saúde" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saúde">Saúde (UBS, CAPS)</SelectItem>
                    <SelectItem value="Educação">Educação (Escola)</SelectItem>
                    <SelectItem value="Assistência Social">Assistência (CRAS)</SelectItem>
                    <SelectItem value="Jurídico">Jurídico (Defensoria)</SelectItem>
                    <SelectItem value="Conselho Tutelar">Conselho Tutelar</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instituição/Unidade</Label>
                <Input placeholder="Ex: UBS 01 de Brazlândia" value={newInst} onChange={e => setNewInst(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo do Encaminhamento</Label>
              <Textarea placeholder="Descreva a demanda..." value={newReason} onChange={e => setNewReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createReferral()} disabled={!newType || !newInst || !newReason || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL ATUALIZAR --- */}
      <Dialog open={!!editingRef} onOpenChange={(open) => !open && setEditingRef(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Encaminhamento</DialogTitle>
            <DialogDescription>
              {editingRef?.instituicao} ({editingRef?.tipo})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status Atual</Label>
              <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente (Aguardando resposta)</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído (Atendido/Inserido)</SelectItem>
                  <SelectItem value="NEGADO">Negado / Sem vaga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contra-referência / Observações</Label>
              <Textarea 
                placeholder="Resposta da instituição ou observações sobre o resultado..." 
                value={editRetorno} 
                onChange={e => setEditRetorno(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRef(null)}>Fechar</Button>
            <Button onClick={() => updateReferral()} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}