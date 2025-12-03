import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { 
  MoreVertical, UserPlus, Power, CheckCircle, ArrowRightCircle, AlertTriangle, Loader2 
} from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"

interface CaseActionsProps {
  caseId: string
  status: string
  currentSpecialistId?: string | null
}

export function CaseActions({ caseId, status, currentSpecialistId }: CaseActionsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  
  // Estados dos formulários
  const [selectedSpecialist, setSelectedSpecialist] = useState("")
  const [closeReason, setCloseReason] = useState("")
  const [closeParecer, setCloseParecer] = useState("")

  // 1. Buscar Especialistas (Apenas para o Modal de Atribuição)
  const { data: specialists = [] } = useQuery({
    queryKey: ['users', 'specialists'],
    queryFn: async () => {
      // Filtra usuários pelo cargo de Especialista
      const res = await api.get('/users')
      return res.data.filter((u: any) => u.cargo === 'Especialista')
    },
    enabled: isAssignOpen // Só busca quando abre o modal
  })

  // 2. Mutation: Mudar Status Simples
  const { mutate: changeStatus } = useMutation({
    mutationFn: async (newStatus: string) => {
      await api.patch(`/cases/${caseId}/status`, { status: newStatus })
    },
    onSuccess: () => {
      toast.success("Status atualizado.")
      queryClient.invalidateQueries({ queryKey: ["case", caseId] })
    },
    onError: () => toast.error("Erro ao mudar status.")
  })

  // 3. Mutation: Atribuir Técnico
  const { mutate: assignSpecialist, isPending: isAssigning } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/assign`, { specialistId: selectedSpecialist })
    },
    onSuccess: () => {
      toast.success("Técnico atribuído com sucesso.")
      setIsAssignOpen(false)
      queryClient.invalidateQueries({ queryKey: ["case", caseId] })
    },
    onError: () => toast.error("Erro ao atribuir técnico.")
  })

  // 4. Mutation: Desligar Caso
  const { mutate: closeCase, isPending: isClosing } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/close`, { 
        motivoDesligamento: closeReason,
        parecerFinal: closeParecer
      })
    },
    onSuccess: () => {
      toast.success("Caso desligado com sucesso.")
      setIsCloseOpen(false)
      queryClient.invalidateQueries({ queryKey: ["case", caseId] })
    },
    onError: () => toast.error("Erro ao desligar caso.")
  })

  // Permissões simples
  const isManager = user?.cargo === 'Gerente'
  const isClosed = status === 'DESLIGADO'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="gap-2">
            Gerenciar <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações do Caso</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Mudar Status (Fluxo Inicial) */}
          {status === 'AGUARDANDO_ACOLHIDA' && (
            <DropdownMenuItem onClick={() => changeStatus('EM_ACOLHIDA')}>
              <ArrowRightCircle className="mr-2 h-4 w-4 text-blue-500" /> Iniciar Acolhida
            </DropdownMenuItem>
          )}
          
          {status === 'EM_ACOLHIDA' && (
            <DropdownMenuItem onClick={() => changeStatus('AGUARDANDO_DISTRIBUICAO_PAEFI')}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Finalizar Acolhida
            </DropdownMenuItem>
          )}

          {/* Atribuir Técnico (Apenas Gerente ou se estiver pendente) */}
          {(isManager || status === 'AGUARDANDO_DISTRIBUICAO_PAEFI') && !isClosed && (
            <DropdownMenuItem onClick={() => setIsAssignOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4 text-purple-500" /> 
              {currentSpecialistId ? "Trocar Técnico" : "Atribuir Técnico"}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Desligar / Reabrir */}
          {!isClosed ? (
            <DropdownMenuItem onClick={() => setIsCloseOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Power className="mr-2 h-4 w-4" /> Desligar Caso
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => changeStatus('AGUARDANDO_ACOLHIDA')}>
              <ArrowRightCircle className="mr-2 h-4 w-4" /> Reabrir Caso
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* --- MODAL: ATRIBUIR TÉCNICO --- */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuição de Técnico PAEFI</DialogTitle>
            <DialogDescription>Selecione o especialista que será responsável pelo acompanhamento.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Especialista</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {specialists.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancelar</Button>
            <Button onClick={() => assignSpecialist()} disabled={!selectedSpecialist || isAssigning}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: DESLIGAR CASO --- */}
      <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Desligamento de Caso
            </DialogTitle>
            <DialogDescription>
              Esta ação encerra o acompanhamento ativo. O histórico será preservado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo do Desligamento</Label>
              <Select value={closeReason} onValueChange={setCloseReason}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Superação da situação">Superação da situação de violação</SelectItem>
                  <SelectItem value="Mudança de endereço">Mudança de endereço (Transferência)</SelectItem>
                  <SelectItem value="Recusa de atendimento">Recusa de atendimento</SelectItem>
                  <SelectItem value="Óbito">Óbito</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parecer Final (Resumo)</Label>
              <Textarea 
                value={closeParecer} 
                onChange={(e) => setCloseParecer(e.target.value)} 
                placeholder="Descreva brevemente o motivo e os resultados alcançados..."
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => closeCase()} disabled={!closeReason || closeParecer.length < 5 || isClosing}>
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Encerrar Caso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}