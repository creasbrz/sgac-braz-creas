// frontend/src/pages/WaitingList.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Loader2, Users, CalendarClock,
  ArrowUpRight, Eye, UserPlus, FileText, CheckCircle2 
} from 'lucide-react'
import { toast } from 'sonner'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'

import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'

// --- INTEGRAÇÃO COM CONSTANTES ---
import { ROUTES } from '@/constants/app-routes'
import { STATUS_CONFIG, getUrgencyColor } from '@/constants/cases/styles' // Caminho corrigido
import { CaseStatusType } from '@/constants/cases/definitions'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
interface WaitingCase {
  id: string
  nomeCompleto: string
  dataEntrada: string
  urgencia: 'ALTA' | 'MEDIA' | 'BAIXA' | null
  violacao: string | string[] | null 
  status: CaseStatusType
}

interface Specialist {
  id: string
  nome: string
}

// --- CONFIGURAÇÃO DE VIEW POR CARGO ---
const ROLE_CONFIG = {
  Agente_Social: {
    title: 'Fila de Acolhida',
    description: 'Casos aguardando primeira escuta qualificada.',
    actionLabel: 'Acolher',
    actionIcon: UserPlus,
    emptyMessage: 'Nenhum caso aguardando na porta de entrada.',
    emptyIcon: CheckCircle2
  },
  Gerente: {
    title: 'Fila para Distribuição',
    description: 'Casos triados aguardando designação de especialista.',
    actionLabel: 'Distribuir',
    actionIcon: ArrowUpRight,
    emptyMessage: 'Nenhum caso aguardando distribuição técnica.',
    emptyIcon: CheckCircle2
  },
  Especialista: {
    title: 'Aguardando Acolhida Especializada',
    description: 'Casos atribuídos aguardando início do acompanhamento.',
    actionLabel: 'Iniciar',
    actionIcon: FileText,
    emptyMessage: 'Sua caixa de entrada está vazia.',
    emptyIcon: CalendarClock
  },
  Auditor: {
    title: 'Auditoria de Filas',
    description: 'Visão geral de gargalos no fluxo de atendimento.',
    actionLabel: 'Auditar',
    actionIcon: Eye,
    emptyMessage: 'Fluxo fluindo sem gargalos aparentes.',
    emptyIcon: CheckCircle2
  }
}

export function WaitingList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isPrivacyMode } = usePrivacy()

  const [selectedCase, setSelectedCase] = useState<WaitingCase | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('')
  const [isDistributeOpen, setIsDistributeOpen] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const { data: cases = [], isLoading } = useQuery<WaitingCase[]>({
    queryKey: ['waiting-list'],
    queryFn: async () => (await api.get('/cases/waiting')).data,
    enabled: !!user,
    staleTime: 1000 * 30 
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
    onMutate: (variables) => setPendingActionId(variables.caseId),
    onSuccess: () => {
      toast.success('Ação realizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] })
      queryClient.invalidateQueries({ queryKey: ['workspace-summary'] })
      setIsDistributeOpen(false)
      setSelectedCase(null)
      setSelectedSpecialist('')
    },
    onError: () => toast.error('Erro ao processar ação.'),
    onSettled: () => setPendingActionId(null)
  })

  if (!user) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
  
  const config = ROLE_CONFIG[user.cargo as keyof typeof ROLE_CONFIG] || {
    title: 'Fila de Espera', description: 'Gestão de fila.', actionLabel: 'Ação', actionIcon: ArrowUpRight, emptyMessage: 'Lista vazia', emptyIcon: Users
  }

  const handleButtonClick = (c: WaitingCase) => {
    if (user.cargo === 'Gerente') {
      setSelectedCase(c)
      setIsDistributeOpen(true)
    } else if (user.cargo === 'Auditor') {
      navigate(`${ROUTES.CASES}/${c.id}`) 
    } else {
      handleAction({ caseId: c.id })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-1 animate-pulse">
        <div className="flex justify-between items-end border-b border-border pb-6">
           <div className="space-y-2">
             <Skeleton className="h-8 w-48"/>
             <Skeleton className="h-4 w-96"/>
           </div>
           <Skeleton className="h-10 w-32 rounded-lg"/>
        </div>
        <Card className="border border-border/60 shadow-sm">
           <div className="p-0">
             <div className="h-10 bg-muted/30 border-b border-border/60" />
             {[1,2,3,4,5].map(i => (
               <div key={i} className="flex items-center p-4 gap-4 border-b border-border/40 last:border-0">
                  <Skeleton className="h-12 w-12 rounded-full"/>
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3"/>
                    <Skeleton className="h-3 w-1/4"/>
                  </div>
                  <Skeleton className="h-8 w-24"/>
               </div>
             ))}
           </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {config.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{config.description}</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50 shadow-sm">
           <Users className="h-4 w-4 text-muted-foreground"/>
           <span className="font-semibold text-foreground tabular-nums">{cases.length}</span>
           <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Aguardando</span>
        </div>
      </div>

      {/* TABLE CARD */}
      <Card className="overflow-hidden border border-border shadow-sm bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-border/60">
                <TableHead className="w-[40%] pl-6 py-3 font-semibold text-muted-foreground">Caso / Violações</TableHead>
                <TableHead className="w-[15%] font-semibold text-muted-foreground">Urgência</TableHead>
                <TableHead className="w-[20%] font-semibold text-muted-foreground">Tempo de Espera</TableHead>
                {user.cargo === 'Auditor' && <TableHead className="font-semibold text-muted-foreground">Status</TableHead>}
                <TableHead className="text-right w-[20%] pr-6 font-semibold text-muted-foreground">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={user.cargo === 'Auditor' ? 5 : 4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <div className="p-4 bg-muted/50 rounded-full ring-1 ring-border">
                        <config.emptyIcon className="h-8 w-8 opacity-50 text-muted-foreground"/>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/80">{config.emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => {
                  const daysWaiting = isValid(new Date(c.dataEntrada)) ? differenceInDays(new Date(), new Date(c.dataEntrada)) : 0
                  const isCriticalDelay = daysWaiting > 15
                  const isPending = pendingActionId === c.id
                  const ActionIcon = config.actionIcon
                  const statusConfig = STATUS_CONFIG[c.status] || { label: c.status, className: 'bg-slate-100 text-slate-700' }

                  // Normalização da lista de violações
                  let violationsList: string[] = [];
                  if (Array.isArray(c.violacao)) {
                    violationsList = c.violacao;
                  } else if (typeof c.violacao === 'string') {
                    violationsList = c.violacao.split(',').map(v => v.trim()).filter(Boolean);
                  }

                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                      
                      {/* Nome e Tags de Violação */}
                      <TableCell className="pl-6 py-4 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className={cn(
                            "font-semibold text-sm text-foreground group-hover:text-primary transition-colors",
                            isPrivacyMode && "blur-[6px] select-none opacity-80"
                          )}>
                            {c.nomeCompleto}
                          </span>
                          
                          {/* LISTA DE VIOLAÇÕES COMO TAGS */}
                          <div className={cn("flex flex-wrap gap-1.5 items-center", isPrivacyMode && "blur-xs opacity-70")}>
                             {violationsList.length > 0 ? (
                               <>
                                 {violationsList.slice(0, 2).map((v, i) => (
                                   <Badge 
                                     key={i} 
                                     variant="outline" 
                                     className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-border/60 bg-muted/20 whitespace-nowrap"
                                   >
                                     {v}
                                   </Badge>
                                 ))}
                                 
                                 {violationsList.length > 2 && (
                                   <TooltipProvider>
                                     <Tooltip delayDuration={300}>
                                       <TooltipTrigger asChild>
                                          <Badge 
                                            variant="outline" 
                                            className="text-[10px] h-5 px-1.5 font-medium cursor-help bg-muted/50 hover:bg-muted hover:text-foreground transition-colors"
                                          >
                                            +{violationsList.length - 2}
                                          </Badge>
                                       </TooltipTrigger>
                                       <TooltipContent side="bottom" className="text-xs max-w-xs">
                                          <p className="font-semibold mb-1">Todas as violações:</p>
                                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                            {violationsList.map((v, idx) => <li key={idx}>{v}</li>)}
                                          </ul>
                                       </TooltipContent>
                                     </Tooltip>
                                   </TooltipProvider>
                                 )}
                               </>
                             ) : (
                               <span className="text-xs text-muted-foreground/60 italic">Nenhuma violação registrada</span>
                             )}
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Urgência */}
                      <TableCell className="align-top pt-4">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider shadow-none border",
                            getUrgencyColor(c.urgencia)
                          )}
                        >
                          {c.urgencia || 'NORMAL'}
                        </Badge>
                      </TableCell>
                      
                      {/* Tempo de Espera */}
                      <TableCell className="align-top pt-4">
                        <div className="flex flex-col gap-0.5">
                           <div className={cn("flex items-center gap-1.5 text-sm font-medium", isCriticalDelay ? "text-destructive font-bold" : "text-foreground")}>
                             <CalendarClock className="h-3.5 w-3.5 opacity-70"/>
                             <span>{daysWaiting === 0 ? 'Hoje' : `${daysWaiting} dias`}</span>
                           </div>
                           <span className="text-[10px] text-muted-foreground pl-5 uppercase tracking-wide font-medium opacity-70">
                             Desde {isValid(new Date(c.dataEntrada)) ? format(new Date(c.dataEntrada), 'dd/MM', { locale: ptBR }) : '-'}
                           </span>
                        </div>
                      </TableCell>

                      {/* Status (Apenas Auditor) */}
                      {user.cargo === 'Auditor' && (
                        <TableCell className="align-top pt-4">
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] font-normal border shadow-none whitespace-nowrap", statusConfig.className)}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Ação */}
                      <TableCell className="text-right pr-6 align-top pt-3">
                        <Button 
                          size="sm" 
                          variant={user.cargo === 'Gerente' ? "default" : "secondary"}
                          className={cn(
                            "font-medium shadow-sm h-8 px-3 gap-2 transition-all min-w-27.5", 
                            user.cargo === 'Gerente' && "bg-primary hover:bg-primary/90 text-primary-foreground"
                          )}
                          disabled={!!pendingActionId} 
                          onClick={() => handleButtonClick(c)}
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <ActionIcon className="h-3.5 w-3.5"/>}
                          <span className="hidden sm:inline">{isPending ? 'Processando' : config.actionLabel}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL DE DISTRIBUIÇÃO */}
      <Dialog open={isDistributeOpen} onOpenChange={(open) => { if(!open) setIsDistributeOpen(false) }}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="bg-primary/10 p-1.5 rounded-md border border-primary/20">
                 <ArrowUpRight className="h-5 w-5 text-primary"/>
              </div>
              Distribuir Caso
            </DialogTitle>
            <DialogDescription>
              Atribua este caso a um técnico de referência para início imediato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedCase && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 text-sm space-y-2">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Caso Selecionado</p>
                      <span className={cn("font-medium text-base block truncate max-w-70", isPrivacyMode && "blur-sm select-none")}>
                        {selectedCase.nomeCompleto}
                      </span>
                   </div>
                   <Badge variant="outline" className={cn("text-[10px] self-start mt-1", getUrgencyColor(selectedCase.urgencia))}>
                      {selectedCase.urgencia || 'Normal'}
                   </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="specialist" className="text-sm font-medium">Especialista de Referência</Label>
              <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                <SelectTrigger id="specialist" className="h-10 bg-background">
                  <SelectValue placeholder="Selecione um técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {specialists.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="cursor-pointer">{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDistributeOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => selectedCase && handleAction({ caseId: selectedCase.id, targetUserId: selectedSpecialist })}
              disabled={!selectedSpecialist || !!pendingActionId}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-30"
            >
              {pendingActionId ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}