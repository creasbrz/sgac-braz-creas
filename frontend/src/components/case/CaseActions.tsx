// frontend/src/components/case/CaseActions.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  MoreHorizontal, UserPlus, ArrowRight, CheckCircle2, XCircle, 
  Loader2, Power, AlertTriangle 
} from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { getAvailableActions, type StatusAction } from '@/constants/cases/transitions'
import { LISTA_MOTIVOS_DESLIGAMENTO, LISTA_DESTINOS } from '@/constants/cases/definitions'

import { AssignSpecialistModal } from '@/components/modals/AssignSpecialistModal'

interface CaseActionsProps {
  caseId: string
  status: string
  currentSpecialistId?: string
  // [NEW PROPS] For SEI control on case closure
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modal States
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusAction | null>(null)

  // Closure Form States
  const [closeReason, setCloseReason] = useState('')
  const [closeDestination, setCloseDestination] = useState('')
  const [closeParecer, setCloseParecer] = useState('')

  // 1. Mutation: Change Status
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

  // 2. Mutation: Close Case
  const { mutate: closeCase, isPending: isClosing } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/close`, {
        motivoDesligamento: closeReason,
        destinoDesligamento: closeDestination,
        parecerFinal: closeParecer
      })
    },
    onSuccess: () => {
      toast.success('Caso desligado e arquivado.')
      setIsCloseOpen(false)
      
      // Invalidate cache to update UI
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      
      navigate(`/app/cases/${caseId}`) 
    },
    onError: () => toast.error('Erro ao desligar caso.')
  })

  const actions = user ? getAvailableActions(status, user.cargo) : []
  if (!actions.length) return null

  // Centralized Handler
  const handleAction = (action: StatusAction) => {
    if (action.type === 'assign') setIsAssignOpen(true)
    else if (action.type === 'close') setIsCloseOpen(true)
    else if (action.type === 'status' && action.nextStatus) setPendingStatusAction(action)
  }

  const primaryAction = actions.find(a => a.variant === 'default' || a.type === 'status')
  const secondaryActions = actions.filter(a => a !== primaryAction)

  return (
    <div className="flex items-center gap-2">
      {/* Primary Action Button */}
      {primaryAction && (
        <Button 
          onClick={() => handleAction(primaryAction)}
          className="shadow-sm font-medium"
          variant={primaryAction.variant}
        >
          {primaryAction.type === 'status' && <ArrowRight className="mr-2 h-4 w-4" />}
          {primaryAction.type === 'assign' && <UserPlus className="mr-2 h-4 w-4" />}
          {primaryAction.label}
        </Button>
      )}

      {/* Secondary Actions Menu */}
      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Outras Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {secondaryActions.map((action, idx) => (
              <DropdownMenuItem 
                key={idx} 
                onClick={() => handleAction(action)}
                className={`cursor-pointer gap-2 ${action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}`}
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

      {/* --- MODALS --- */}

      <AssignSpecialistModal 
        isOpen={isAssignOpen} 
        onOpenChange={setIsAssignOpen} 
        caseId={caseId} 
      />

      {/* Status Transition Modal */}
      <Dialog open={!!pendingStatusAction} onOpenChange={(o) => !o && setPendingStatusAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Caso</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja mover este caso para <strong>{pendingStatusAction?.label}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingStatusAction(null)}>Cancelar</Button>
            <Button 
              onClick={() => pendingStatusAction?.nextStatus && changeStatus(pendingStatusAction.nextStatus)}
              disabled={isChanging}
            >
              {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case Closure Modal (Critical) */}
      <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Desligamento do Caso
            </DialogTitle>
            <DialogDescription>
              Esta ação encerra o ciclo de atendimento. O caso será arquivado.
            </DialogDescription>
          </DialogHeader>
          
          {/* [NEW] PENDING SEI RESPONSE ALERT */}
          {numeroSei && !seiRespondido && (
            <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="ml-2 font-bold">Resposta ao SEI Pendente</AlertTitle>
              <AlertDescription className="ml-2 text-xs mt-1">
                O processo <strong>{numeroSei}</strong> consta como não respondido. 
                <br/>Lembre-se de enviar o ofício de resposta ao órgão demandante informando o desligamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Standard Warning Alert */}
          {(!numeroSei || seiRespondido) && (
             <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Certifique-se de que todos os relatórios e encaminhamentos foram concluídos antes de prosseguir.
                </AlertDescription>
             </Alert>
          )}

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Motivo do Desligamento</Label>
              <Select onValueChange={setCloseReason}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo principal..." /></SelectTrigger>
                <SelectContent>
                  {LISTA_MOTIVOS_DESLIGAMENTO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destino / Encaminhamento</Label>
              <Select onValueChange={setCloseDestination}>
                <SelectTrigger><SelectValue placeholder="Para onde o usuário foi encaminhado?" /></SelectTrigger>
                <SelectContent>
                  {LISTA_DESTINOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parecer Técnico Final</Label>
              <Textarea 
                value={closeParecer} 
                onChange={e => setCloseParecer(e.target.value)} 
                placeholder="Breve resumo do caso e justificativa do encerramento..." 
                className="h-24 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={() => closeCase()} 
              disabled={!closeReason || !closeParecer || isClosing}
            >
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Encerrar Caso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}