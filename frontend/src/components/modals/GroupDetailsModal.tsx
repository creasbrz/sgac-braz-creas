// frontend/src/components/modals/GroupDetailsModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { 
  Users, CheckCircle2, Loader2, UserPlus, X, 
  Calendar, AlertCircle, Check, ChevronsUpDown, Clock, 
  UserCheck
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { GroupActivity } from '@/types/group'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"

import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { GroupAttendanceDoc } from '@/components/reports/templates/GroupAttendanceDoc'

// --- TYPES ---
interface GroupDetailsModalProps {
  group: GroupActivity | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface Candidate {
  id: string
  nomeCompleto: string
  status: string
}

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  className?: string
  iconClassName?: string
}

// --- SUB-COMPONENT: METRIC CARD ---
const MetricCard = ({ icon: Icon, label, value, className, iconClassName }: MetricCardProps) => (
  <div className={cn(
    "flex flex-col items-center justify-center p-4 rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
    className
  )}>
    <div className={cn("p-2.5 rounded-full mb-2 bg-background", iconClassName)}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</span>
    <span className="text-2xl font-bold mt-0.5 tracking-tight text-foreground">{value}</span>
  </div>
)

export function GroupDetailsModal({ group, isOpen, onOpenChange }: GroupDetailsModalProps) {
  const queryClient = useQueryClient()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  // --- QUERIES ---
  const { data: groupDetails, isLoading: isLoadingDetails } = useQuery<GroupActivity>({
    queryKey: ['group', group?.id],
    queryFn: async () => (await api.get(`/groups/${group?.id}`)).data,
    enabled: !!group && isOpen
  })

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ['group-candidates', group?.id],
    queryFn: async () => {
      if (!group) return []
      const res = await api.get(`/groups/${group.id}/candidates`)
      return res.data
    },
    enabled: !!group && isOpen,
  })

  // --- MUTATIONS ---
  const { mutate: updateAttendance } = useMutation({
    mutationFn: async ({ caseId, presente }: { caseId: string, presente: boolean }) => {
      if (!group) return
      await api.patch(`/groups/${group.id}/attendance/${caseId}`, { presente })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] }) 
      toast.success(variables.presente ? 'Presença confirmada.' : 'Presença removida.')
    },
    onError: () => toast.error('Erro ao atualizar presença.')
  })

  const { mutate: addParticipants, isPending: isAddingParticipant } = useMutation({
    mutationFn: async () => {
      if (!group || selectedCandidates.length === 0) return
      await api.post(`/groups/${group.id}/participants`, { caseIds: selectedCandidates })
    },
    onSuccess: (data: any) => {
      toast.success(data?.data?.message || 'Participantes incluídos!')
      setSelectedCandidates([]) 
      setOpenCombobox(false)
      queryClient.invalidateQueries({ queryKey: ['group', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-candidates', group?.id] })
    },
    onError: () => toast.error('Erro ao adicionar participantes.')
  })

  // --- HANDLERS ---
  const toggleCandidate = (caseId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    )
  }

  // --- COMPUTED ---
  const participantes = groupDetails?.participantes || []
  const presentesCount = participantes.filter(p => p.presente).length
  const ausentesCount = participantes.filter(p => !p.presente).length
  
  const filteredCandidates = candidates 

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-border bg-background">
        
        {/* HEADER */}
        <DialogHeader className="p-6 border-b border-border bg-muted/10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <DialogTitle className="flex flex-wrap items-center gap-3 text-xl font-bold tracking-tight">
                {group?.tema}
                <Badge variant="secondary" className="font-medium text-xs px-2 py-0.5 border-border/50 bg-background">
                  {group?.tipo.replace('_', ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 text-sm text-muted-foreground/80">
                <span className="flex items-center gap-1.5">
                   <Calendar className="h-4 w-4 opacity-70" />
                   {group?.dataRealizacao ? format(new Date(group.dataRealizacao), "dd 'de' MMMM 'às' HH:mm") : '-'}
                </span>
                {group?.orgaosEnvolvidos && group.orgaosEnvolvidos.length > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 opacity-70" /> {group.orgaosEnvolvidos.length} parceiros
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
            
            {/* AÇÕES DE IMPRESSÃO */}
            <div className="flex gap-2 shrink-0">
              {group && (
                <>
                  <PDFDownloadButton 
                    document={<GroupAttendanceDoc group={group} participants={participantes} type="blank" />}
                    fileName={`Lista_Frequencia_Branca_${group.tema.replace(/\s+/g, '_')}.pdf`}
                    label="Lista em Branco"
                    variant="outline"
                    size="sm"
                    className="h-9"
                  />
                  <PDFDownloadButton 
                    document={<GroupAttendanceDoc group={group} participants={participantes} type="filled" />}
                    fileName={`Relatorio_Execucao_${group.tema.replace(/\s+/g, '_')}.pdf`}
                    label="Relatório"
                    variant="outline"
                    size="sm"
                    className="h-9"
                  />
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary/50"/>
            <p className="text-sm">Carregando detalhes da atividade...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* COLUNA ESQUERDA: ESTATÍSTICAS E ADIÇÃO */}
            <aside className="w-full md:w-80 border-r border-border bg-muted/5 p-6 space-y-8 overflow-y-auto shrink-0">
              
              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={Users} 
                  label="Inscritos" 
                  value={participantes.length} 
                  className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800"
                  iconClassName="text-blue-600 bg-blue-100/50 dark:text-blue-400 dark:bg-blue-900/30"
                />
                 <MetricCard 
                  icon={CheckCircle2} 
                  label="Presentes" 
                  value={presentesCount} 
                  className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800"
                  iconClassName="text-emerald-600 bg-emerald-100/50 dark:text-emerald-400 dark:bg-emerald-900/30"
                />
                 <MetricCard 
                  icon={AlertCircle} 
                  label="Ausentes" 
                  value={ausentesCount} 
                  className="bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800"
                  iconClassName="text-rose-600 bg-rose-100/50 dark:text-rose-400 dark:bg-rose-900/30"
                />
                <MetricCard 
                  icon={Clock} 
                  label="Duração" 
                  value="2h" 
                  className="bg-slate-50/50 border-slate-100 dark:bg-slate-900/10 dark:border-slate-800"
                  iconClassName="text-slate-600 bg-slate-100/50 dark:text-slate-400 dark:bg-slate-800"
                />
              </div>

              <Separator className="bg-border/60" />

              {/* Adicionar Participantes */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar Participantes
                  </Label>
                  {selectedCandidates.length > 0 && (
                    <Badge variant="default" className="text-[10px] h-5 px-1.5">{selectedCandidates.length}</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-10 px-3 bg-background border-dashed hover:border-solid transition-all">
                        {selectedCandidates.length > 0 
                          ? <span className="text-foreground font-medium">{selectedCandidates.length} selecionado(s)</span>
                          : <span className="text-muted-foreground font-normal">Buscar usuário...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-70 p-0 shadow-xl" align="start">
                      <Command>
                        <CommandInput placeholder="Nome do usuário..." className="h-9" />
                        <CommandList>
                          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">Nenhum candidato disponível.</CommandEmpty>
                          <CommandGroup>
                            {filteredCandidates.map((c) => (
                              <CommandItem key={c.id} value={c.nomeCompleto} onSelect={() => toggleCandidate(c.id)} className="cursor-pointer">
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors", 
                                  selectedCandidates.includes(c.id) ? "bg-primary text-primary-foreground" : "opacity-30"
                                )}>
                                  <Check className="h-3 w-3" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium">{c.nomeCompleto}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.status}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button 
                    className="w-full h-10 shadow-sm" 
                    onClick={() => addParticipants()} 
                    disabled={selectedCandidates.length === 0 || isAddingParticipant}
                  >
                    {isAddingParticipant ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserPlus className="h-4 w-4 mr-2"/>}
                    Confirmar Inclusão
                  </Button>
                </div>
              </div>
            </aside>

            {/* COLUNA DIREITA: LISTA DE CHAMADA */}
            <main className="flex-1 flex flex-col min-w-0 bg-background">
              <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Lista de Chamada
                </h3>
                <span className="text-xs font-medium text-muted-foreground bg-background px-2.5 py-1 rounded-md border border-border">
                  Total: {participantes.length}
                </span>
              </div>

              <ScrollArea className="flex-1">
                {participantes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-75 text-muted-foreground gap-4 p-8">
                    <div className="bg-muted p-5 rounded-full ring-1 ring-border">
                      <UserPlus className="h-8 w-8 opacity-20" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-foreground">Lista de presença vazia</p>
                      <p className="text-sm opacity-70 max-w-50 mx-auto">Utilize o painel lateral para adicionar participantes à atividade.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {participantes.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-transparent transition-all",
                            p.presente 
                              ? "bg-emerald-100 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-900/30" 
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                          )}>
                            {p.caso.nomeCompleto.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="font-medium text-sm leading-none truncate">{p.caso.nomeCompleto}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono opacity-70">ID: {p.caso.id.slice(0,8)}</p>
                          </div>
                        </div>

                        <Button
                          variant={p.presente ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateAttendance({ caseId: p.caso.id, presente: !p.presente })}
                          className={cn(
                            "h-8 text-xs min-w-27.5 transition-all font-medium ml-4",
                            p.presente 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm" 
                              : "text-muted-foreground hover:text-foreground border-dashed hover:border-solid hover:bg-muted"
                          )}
                        >
                          {p.presente ? (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Presente
                            </>
                          ) : (
                            <>
                              <X className="mr-1.5 h-3.5 w-3.5" /> Ausente
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </main>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}