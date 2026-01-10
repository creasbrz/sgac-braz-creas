import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, differenceInDays, isValid } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { 
  Loader2, Users, AlertCircle, CalendarClock,
  ArrowUpRight, Eye, UserX
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { useAuth } from '@/hooks/useAuth'
import { getUrgencyColor } from '@/constants/caseConstants'
import { usePrivacy } from '@/contexts/PrivacyContext' // [NOVO]
import { cn } from '@/lib/utils' // [NOVO]

interface WaitingCase {
  id: string
  nomeCompleto: string
  dataEntrada: string
  urgencia: 'ALTA' | 'MEDIA' | 'BAIXA' | null
  violacao: string | null
  status: string
}

interface Specialist {
  id: string
  nome: string
}

const formatStatus = (status: string) => {
  if (!status) return '-'
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

const getSafeDaysWaiting = (dateStr: string) => {
  const date = new Date(dateStr)
  return isValid(date) ? differenceInDays(new Date(), date) : 0
}

export function WaitingList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isPrivacyMode } = usePrivacy() // [NOVO]

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('')
  const [isDistributeOpen, setIsDistributeOpen] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const { data: cases = [], isLoading } = useQuery<WaitingCase[]>({
    queryKey: ['waiting-list'],
    queryFn: async () => (await api.get('/cases/waiting')).data,
    enabled: !!user
  })

  const { data: specialists = [] } = useQuery<Specialist[]>({
    queryKey: ['users', 'specialists'],
    queryFn: async () => (await api.get('/users?cargo=Especialista')).data,
    enabled: user?.cargo === 'Gerente' && isDistributeOpen
  })

  const { mutate: handleAction } = useMutation({
    mutationFn: async (data: { caseId: string, targetUserId?: string }) => {
      await api.patch(`/cases/waiting/${data.caseId}/assign`, {
        targetUserId: data.targetUserId
      })
    },
    onMutate: (variables) => {
      setPendingActionId(variables.caseId)
    },
    onSuccess: () => {
      toast.success('Ação realizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] })
      queryClient.invalidateQueries({ queryKey: ['workspace-summary'] })
      setIsDistributeOpen(false)
      setSelectedCaseId(null)
      setSelectedSpecialist('')
    },
    onError: () => toast.error('Erro ao processar ação.'),
    onSettled: () => {
      setPendingActionId(null)
    }
  })

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground animate-in fade-in">
        <UserX className="h-10 w-10 mb-2 opacity-50" />
        <p>Sessão inválida ou expirada.</p>
      </div>
    )
  }

  const getPageConfig = () => {
    switch (user.cargo) {
      case 'Agente_Social':
        return {
          title: 'Fila de Acolhida',
          description: 'Cidadãos aguardando primeira escuta qualificada.',
          actionLabel: 'Acolher',
          emptyMessage: 'Nenhum caso aguardando na porta de entrada.'
        }
      case 'Gerente':
        return {
          title: 'Fila para Distribuição',
          description: 'Casos triados aguardando designação de especialista de referência (ACOMPANHAMENTO).',
          actionLabel: 'Distribuir',
          emptyMessage: 'Nenhum caso aguardando distribuição técnica.'
        }
      case 'Especialista':
        return {
          title: 'Aguardando Acolhida Especializada',
          description: 'Casos atribuídos aguardando início do acompanhamento técnico.',
          actionLabel: 'Iniciar',
          emptyMessage: 'Sua caixa de entrada está vazia.'
        }
      case 'Auditor':
        return {
          title: 'Auditoria de Filas',
          description: 'Visão geral de gargalos no fluxo de atendimento.',
          actionLabel: 'Auditar',
          emptyMessage: 'Fluxo fluindo sem gargalos aparentes.'
        }
      default:
        return { title: 'Fila de Espera', description: '', actionLabel: 'Ação', emptyMessage: 'Lista vazia' }
    }
  }

  const config = getPageConfig()

  const onActionButtonClick = (c: WaitingCase) => {
    if (user.cargo === 'Gerente') {
      setSelectedCaseId(c.id)
      setIsDistributeOpen(true)
    } else if (user.cargo === 'Auditor') {
      navigate(`/cases/${c.id}`)
    } else {
      handleAction({ caseId: c.id })
    }
  }

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h1>
          <p className="text-muted-foreground mt-1">{config.description}</p>
        </div>
        <div className="bg-muted/50 px-4 py-2 rounded-lg flex items-center gap-2 border shadow-sm">
            <Users className="h-4 w-4 text-muted-foreground"/>
            <span className="font-bold text-lg tabular-nums">{cases.length}</span>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Casos na Fila</span>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[35%]">Nome do Caso / Violação</TableHead>
                <TableHead className="w-[15%]">Urgência</TableHead>
                <TableHead className="w-[25%]">Tempo de Espera</TableHead>
                {user.cargo === 'Auditor' && <TableHead>Status Atual</TableHead>}
                <TableHead className="text-right w-[15%]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user.cargo === 'Auditor' ? 5 : 4} className="h-32 text-center text-muted-foreground">
                    {config.emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => {
                  const daysWaiting = getSafeDaysWaiting(c.dataEntrada)
                  const violacaoText = c.violacao || 'Não classificado'
                  const isPending = pendingActionId === c.id

                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/5 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {/* [CORREÇÃO] Blur aplicado apenas ao Nome */}
                          <span className={cn(
                            "font-semibold text-sm text-foreground transition-all duration-300",
                            isPrivacyMode && "blur-[6px] select-none opacity-80"
                          )}>
                            {c.nomeCompleto}
                          </span>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                             <AlertCircle className="h-3 w-3 opacity-70"/>
                             {/* [CORREÇÃO] Blur aplicado apenas à Violação */}
                             {violacaoText.length > 30 ? (
                               <TooltipProvider>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                      <span className={cn(
                                        "cursor-help truncate max-w-[200px] border-b border-dotted border-muted-foreground/50 transition-all duration-300",
                                        isPrivacyMode && "blur-[4px] select-none opacity-80"
                                      )}>
                                        {violacaoText}
                                      </span>
                                   </TooltipTrigger>
                                   <TooltipContent>{violacaoText}</TooltipContent>
                                 </Tooltip>
                               </TooltipProvider>
                             ) : (
                               <span className={cn(
                                 "transition-all duration-300",
                                 isPrivacyMode && "blur-[4px] select-none opacity-80"
                               )}>
                                 {violacaoText}
                               </span>
                             )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`px-2.5 py-0.5 text-xs shadow-sm font-medium ${getUrgencyColor(c.urgencia)}`}
                        >
                          {c.urgencia === 'ALTA' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {c.urgencia || 'Normal'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                           <span className={`text-sm font-medium flex items-center gap-1 ${daysWaiting > 15 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                             <CalendarClock className="h-3.5 w-3.5 text-muted-foreground"/>
                             {daysWaiting === 0 ? 'Hoje' : `${daysWaiting} dias`}
                           </span>
                           <span className="text-xs text-muted-foreground pl-5">
                             Desde {isValid(new Date(c.dataEntrada)) ? format(new Date(c.dataEntrada), 'dd/MM/yyyy') : '-'}
                           </span>
                        </div>
                      </TableCell>

                      {user.cargo === 'Auditor' && (
                        <TableCell>
                           <Badge variant="secondary" className="text-[10px] font-normal border-border bg-background">{formatStatus(c.status)}</Badge>
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant={user.cargo === 'Gerente' ? "default" : "secondary"}
                          className="font-medium shadow-sm transition-all active:scale-95"
                          disabled={!!pendingActionId} 
                          onClick={() => onActionButtonClick(c)}
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : 
                           user.cargo === 'Auditor' ? <Eye className="h-3.5 w-3.5 mr-2"/> :
                           <ArrowUpRight className="h-3.5 w-3.5 mr-2"/>
                          }
                          {isPending ? 'Processando...' : config.actionLabel}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Distribuir Caso</DialogTitle>
            <DialogDescription>
              Selecione o especialista de referência responsável pelo acompanhamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label>Especialista de Referência</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione na lista..." />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDistributeOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => selectedCaseId && handleAction({ caseId: selectedCaseId, targetUserId: selectedSpecialist })}
              disabled={!selectedSpecialist || !!pendingActionId}
            >
              {pendingActionId ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
              Confirmar Distribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}