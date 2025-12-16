// frontend/src/components/case/CaseActions.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, UserPlus, ArrowRightLeft, Power, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { getAvailableActions, type StatusAction } from '@/constants/caseTransitions'
import { AssignSpecialistModal } from '@/components/modals/AssignSpecialistModal'
import { MOTIVOS_DESLIGAMENTO, DESTINOS_DESLIGAMENTO } from '@/constants/caseConstants'

interface CaseActionsProps {
  caseId: string
  status: string
  currentSpecialistId?: string
}

export function CaseActions({ caseId, status }: CaseActionsProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modais
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  
  // Confirmação de Mudança de Status Simples
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusAction | null>(null)

  // Dados do formulário de desligamento
  const [closeReason, setCloseReason] = useState('')
  const [closeDestination, setCloseDestination] = useState('')
  const [closeParecer, setCloseParecer] = useState('')

  // 1. Mutação para Mudar Status (Simples)
  const { mutate: changeStatus, isPending: isChanging } = useMutation({
    mutationFn: async (newStatus: string) => {
      await api.patch(`/cases/${caseId}/status`, { status: newStatus })
    },
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      setPendingStatusAction(null)
    },
    onError: () => toast.error('Erro ao atualizar status.')
  })

  // 2. Mutação para Desligar
  const { mutate: closeCase, isPending: isClosing } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/close`, {
        motivoDesligamento: closeReason,
        destinoDesligamento: closeDestination,
        parecerFinal: closeParecer
      })
    },
    onSuccess: () => {
      toast.success('Caso desligado com sucesso.')
      setIsCloseOpen(false)
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      navigate('/cases')
    },
    onError: () => toast.error('Erro ao desligar caso.')
  })

  // Ações disponíveis baseadas no cargo e status
  const actions = user ? getAvailableActions(status, user.cargo) : []

  const handleActionClick = (action: StatusAction) => {
    if (action.type === 'assign') {
      setIsAssignOpen(true)
    } else if (action.type === 'close') {
      setIsCloseOpen(true)
    } else if (action.type === 'status' && action.nextStatus) {
      setPendingStatusAction(action)
    }
  }

  if (!actions.length) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="gap-2 shadow-sm">
            Gerenciar <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações Disponíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action, idx) => (
            <DropdownMenuItem 
              key={idx} 
              onClick={() => handleActionClick(action)}
              className="cursor-pointer gap-2 py-2"
            >
              {action.type === 'assign' && <UserPlus className="h-4 w-4 text-blue-500" />}
              {action.type === 'status' && <ArrowRightLeft className="h-4 w-4 text-emerald-500" />}
              {action.type === 'close' && <Power className="h-4 w-4 text-red-500" />}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Atribuição */}
      <AssignSpecialistModal 
        isOpen={isAssignOpen} 
        onOpenChange={setIsAssignOpen} 
        caseId={caseId} 
      />

      {/* Modal de Confirmação de Mudança de Status */}
      <Dialog open={!!pendingStatusAction} onOpenChange={(open) => !open && setPendingStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Transição</DialogTitle>
            <DialogDescription>
              Deseja alterar o status para <strong>{pendingStatusAction?.label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatusAction(null)}>Cancelar</Button>
            <Button 
              onClick={() => pendingStatusAction?.nextStatus && changeStatus(pendingStatusAction.nextStatus)}
              disabled={isChanging}
            >
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Desligamento */}
      <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Desligamento do Caso</DialogTitle>
            <DialogDescription>
              Preencha os dados finais para encerrar o acompanhamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Motivo do Desligamento</Label>
              <Select onValueChange={setCloseReason}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_DESLIGAMENTO.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destino / Encaminhamento Final</Label>
              <Select onValueChange={setCloseDestination}>
                <SelectTrigger><SelectValue placeholder="Para onde foi encaminhado?" /></SelectTrigger>
                <SelectContent>
                  {DESTINOS_DESLIGAMENTO.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parecer Técnico Final</Label>
              <Textarea 
                value={closeParecer} 
                onChange={e => setCloseParecer(e.target.value)} 
                placeholder="Resumo final do caso..." 
                className="h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => closeCase()} 
              disabled={!closeReason || !closeParecer || isClosing}
            >
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Desligamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}