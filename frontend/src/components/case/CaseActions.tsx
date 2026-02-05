// frontend/src/components/case/CaseActions.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  MoreHorizontal, UserPlus, ArrowRight, CheckCircle2, Power, Loader2 
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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

import { getAvailableActions, type StatusAction } from '@/constants/cases/transitions'

// MODAIS
import { AssignSpecialistModal } from '@/components/modals/AssignSpecialistModal'
import { CloseCaseModal } from '@/components/modals/CloseCaseModal'

interface CaseActionsProps {
  caseId: string
  status: string
  currentSpecialistId?: string
  seiRespondido?: boolean
  numeroSei?: string | null
}

export function CaseActions({ 
  caseId, 
  status, 
  seiRespondido = false, 
  numeroSei = null 
}: CaseActionsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Estados de Controle dos Modais
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  
  // Estado para confirmação de mudança de status simples
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusAction | null>(null)

  // Mutation apenas para mudança de status (Encaminhamento/Retorno)
  // O desligamento agora é feito dentro do CloseCaseModal
  const { mutate: changeStatus, isPending: isChanging } = useMutation({
    mutationFn: async (newStatus: string) => {
      await api.patch(`/cases/${caseId}/status`, { status: newStatus })
    },
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] }) 
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setPendingStatusAction(null)
    },
    onError: () => toast.error('Erro ao atualizar status.')
  })

  const actions = user ? getAvailableActions(status, user.cargo) : []
  if (!actions.length) return null

  // Handler Centralizado
  const handleAction = (action: StatusAction) => {
    if (action.type === 'assign') setIsAssignOpen(true)
    else if (action.type === 'close') setIsCloseOpen(true)
    else if (action.type === 'status' && action.nextStatus) setPendingStatusAction(action)
  }

  const primaryAction = actions.find(a => a.variant === 'default' || a.type === 'status')
  const secondaryActions = actions.filter(a => a !== primaryAction)

  return (
    <div className="flex items-center gap-2">
      {/* Botão de Ação Principal */}
      {primaryAction && (
        <Button 
          onClick={() => handleAction(primaryAction)}
          className="shadow-sm font-medium transition-all hover:scale-105 active:scale-95"
          variant={primaryAction.variant}
        >
          {primaryAction.type === 'status' && <ArrowRight className="mr-2 h-4 w-4" />}
          {primaryAction.type === 'assign' && <UserPlus className="mr-2 h-4 w-4" />}
          {primaryAction.label}
        </Button>
      )}

      {/* Menu de Ações Secundárias */}
      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-sm border-border bg-background hover:bg-muted">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Outras Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {secondaryActions.map((action, idx) => (
              <DropdownMenuItem 
                key={idx} 
                onClick={() => handleAction(action)}
                className={`cursor-pointer gap-2 ${action.variant === 'destructive' ? 'text-destructive focus:text-destructive focus:bg-destructive/10' : ''}`}
              >
                {action.type === 'assign' && <UserPlus className="h-4 w-4" />}
                {action.type === 'status' && <CheckCircle2 className="h-4 w-4" />}
                {action.type === 'close' && <Power className="h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* --- MODAIS --- */}

      {/* 1. Modal de Atribuição */}
      <AssignSpecialistModal 
        isOpen={isAssignOpen} 
        onOpenChange={setIsAssignOpen} 
        caseId={caseId} 
      />

      {/* 2. Modal de Desligamento (Refatorado) */}
      <CloseCaseModal 
        caseId={caseId}
        isOpen={isCloseOpen}
        onOpenChange={setIsCloseOpen}
        seiRespondido={seiRespondido}
        numeroSei={numeroSei}
      />

      {/* 3. Modal de Confirmação Simples (Mudança de Status) */}
      <Dialog open={!!pendingStatusAction} onOpenChange={(o) => !o && setPendingStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Caso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja mover este caso para <strong className="text-foreground">{pendingStatusAction?.label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingStatusAction(null)}>Cancelar</Button>
            <Button 
              onClick={() => pendingStatusAction?.nextStatus && changeStatus(pendingStatusAction.nextStatus)}
              disabled={isChanging}
              className="shadow-sm font-semibold"
            >
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}