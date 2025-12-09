// frontend/src/components/case/CaseActions.tsx
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns" // [CORREÇÃO] Importação restaurada
import { MoreVertical, UserPlus, Power, CheckCircle, ArrowRightCircle, Loader2, Users } from "lucide-react"
import { toast } from "sonner"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { MOTIVOS_DESLIGAMENTO } from "@/constants/caseConstants"

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
  const [isGroupLinkOpen, setIsGroupLinkOpen] = useState(false)
  
  const [selectedSpecialist, setSelectedSpecialist] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")
  const [closeReason, setCloseReason] = useState("")
  const [closeParecer, setCloseParecer] = useState("")

  const { data: specialists = [] } = useQuery({
    queryKey: ['users', 'specialists'],
    queryFn: async () => {
      const res = await api.get('/users')
      return res.data.filter((u: any) => u.cargo === 'Especialista')
    },
    enabled: isAssignOpen
  })

  const { data: availableGroups = [] } = useQuery({
    queryKey: ['groups', 'future'],
    queryFn: async () => {
      const res = await api.get('/groups')
      return res.data.filter((g: any) => new Date(g.dataRealizacao) >= new Date())
    },
    enabled: isGroupLinkOpen
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: async (newStatus: string) => api.patch(`/cases/${caseId}/status`, { status: newStatus }),
    onSuccess: () => { toast.success("Status atualizado."); queryClient.invalidateQueries({ queryKey: ["case", caseId] }) }
  })

  const { mutate: assignSpecialist, isPending: isAssigning } = useMutation({
    mutationFn: async () => api.patch(`/cases/${caseId}/assign`, { specialistId: selectedSpecialist }),
    onSuccess: () => { toast.success("Técnico atribuído."); setIsAssignOpen(false); queryClient.invalidateQueries({ queryKey: ["case", caseId] }) }
  })

  const { mutate: closeCase, isPending: isClosing } = useMutation({
    mutationFn: async () => api.patch(`/cases/${caseId}/close`, { motivoDesligamento: closeReason, parecerFinal: closeParecer }),
    onSuccess: () => { toast.success("Caso desligado."); setIsCloseOpen(false); queryClient.invalidateQueries({ queryKey: ["case", caseId] }) }
  })

  const { mutate: linkToGroup, isPending: isLinking } = useMutation({
    mutationFn: async () => api.post(`/groups/${selectedGroup}/participants`, { caseIds: [caseId] }),
    onSuccess: () => {
      toast.success("Usuário vinculado ao grupo!");
      setIsGroupLinkOpen(false);
      setSelectedGroup("");
    },
    onError: () => toast.error("Erro ao vincular.")
  })

  const isManager = user?.cargo === 'Gerente'
  const isClosed = status === 'DESLIGADO'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="gap-2">Gerenciar <MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações do Caso</DropdownMenuLabel>
          <DropdownMenuSeparator />

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

          {(isManager || status === 'AGUARDANDO_DISTRIBUICAO_PAEFI') && !isClosed && (
            <DropdownMenuItem onClick={() => setIsAssignOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4 text-purple-500" /> 
              {currentSpecialistId ? "Trocar Técnico" : "Atribuir Técnico"}
            </DropdownMenuItem>
          )}

          {!isClosed && (
            <DropdownMenuItem onClick={() => setIsGroupLinkOpen(true)}>
              <Users className="mr-2 h-4 w-4 text-indigo-500" /> Vincular a Grupo
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

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

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuição de Técnico PAEFI</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Especialista</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {specialists.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => assignSpecialist()} disabled={!selectedSpecialist || isAssigning}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupLinkOpen} onOpenChange={setIsGroupLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a Atividade Coletiva</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Atividade Disponível</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger><SelectValue placeholder="Selecione uma atividade..." /></SelectTrigger>
                <SelectContent>
                  {availableGroups.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Nenhuma atividade futura encontrada.</div>
                  ) : (
                    availableGroups.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.tema} ({format(new Date(g.dataRealizacao), 'dd/MM')})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupLinkOpen(false)}>Cancelar</Button>
            <Button onClick={() => linkToGroup()} disabled={!selectedGroup || isLinking}>
              {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Desligamento de Caso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={closeReason} onValueChange={setCloseReason}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_DESLIGAMENTO.map((m) => <SelectItem key={m} value={m}>{m.length > 50 ? m.substring(0, 50) + '...' : m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parecer Final</Label>
              <Textarea value={closeParecer} onChange={(e) => setCloseParecer(e.target.value)} className="h-24"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => closeCase()} disabled={!closeReason || isClosing}>Encerrar Caso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}