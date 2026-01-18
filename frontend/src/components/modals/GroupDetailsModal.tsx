// frontend/src/components/modals/GroupDetailsModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { 
  Users, CheckCircle2, Loader2, UserPlus, X, 
  Calendar, AlertCircle, Check, ChevronsUpDown, Clock 
} from 'lucide-react'
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

// [NOVO] Imports de PDF
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

// --- SUB-COMPONENT: METRICS CARD ---
const MetricCard = ({ icon: Icon, label, value, colorClass, bgClass }: any) => (
  <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
    <div className={cn("p-2 rounded-full mb-2", bgClass)}>
      <Icon className={cn("h-4 w-4", colorClass)} />
    </div>
    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
    <span className="text-xl font-bold mt-0.5">{value}</span>
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-3 text-xl">
                {group?.tema}
                <Badge variant="secondary" className="font-normal text-xs uppercase tracking-wide">
                  {group?.tipo.replace('_', ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {group?.dataRealizacao ? format(new Date(group.dataRealizacao), "dd 'de' MMMM 'às' HH:mm") : '-'}
                {group?.orgaosEnvolvidos && group.orgaosEnvolvidos.length > 0 && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {group.orgaosEnvolvidos.length} parceiros
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
            
            {/* AÇÕES DE IMPRESSÃO [ATUALIZADO] */}
            <div className="flex gap-2">
              {group && (
                <>
                  <PDFDownloadButton 
                    document={<GroupAttendanceDoc group={group} participants={participantes} type="blank" />}
                    fileName={`Lista_Frequencia_Branca_${group.tema.replace(/\s+/g, '_')}.pdf`}
                    label="Lista em Branco"
                    variant="outline"
                    size="sm"
                  />
                  <PDFDownloadButton 
                    document={<GroupAttendanceDoc group={group} participants={participantes} type="filled" />}
                    fileName={`Relatorio_Execucao_${group.tema.replace(/\s+/g, '_')}.pdf`}
                    label="Relatório"
                    variant="outline"
                    size="sm"
                  />
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50"/>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* COLUNA ESQUERDA: ESTATÍSTICAS E ADIÇÃO */}
            <div className="w-full md:w-[320px] border-r bg-muted/5 p-4 space-y-6 overflow-y-auto">
              
              {/* Cards de Métricas */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={Users} 
                  label="Inscritos" 
                  value={participantes.length} 
                  colorClass="text-blue-600" 
                  bgClass="bg-blue-100 dark:bg-blue-900/20"
                />
                 <MetricCard 
                  icon={CheckCircle2} 
                  label="Presentes" 
                  value={presentesCount} 
                  colorClass="text-emerald-600" 
                  bgClass="bg-emerald-100 dark:bg-emerald-900/20"
                />
                 <MetricCard 
                  icon={AlertCircle} 
                  label="Ausentes" 
                  value={ausentesCount} 
                  colorClass="text-rose-600" 
                  bgClass="bg-rose-100 dark:bg-rose-900/20"
                />
                <MetricCard 
                  icon={Clock} 
                  label="Duração" 
                  value="2h" 
                  colorClass="text-slate-600" 
                  bgClass="bg-slate-100 dark:bg-slate-800"
                />
              </div>

              <Separator />

              {/* Adicionar Participantes */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Novos Participantes</Label>
                  {selectedCandidates.length > 0 && (
                    <Badge variant="default" className="text-[10px] h-5">{selectedCandidates.length}</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between text-left h-auto min-h-[40px] py-2">
                        {selectedCandidates.length > 0 
                          ? `${selectedCandidates.length} selecionado(s)` 
                          : <span className="text-muted-foreground font-normal">Buscar usuário...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Nome do usuário..." />
                        <CommandList>
                          <CommandEmpty>Nenhum candidato disponível.</CommandEmpty>
                          <CommandGroup>
                            {filteredCandidates.map((c) => (
                              <CommandItem key={c.id} value={c.nomeCompleto} onSelect={() => toggleCandidate(c.id)}>
                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selectedCandidates.includes(c.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                  <Check className={cn("h-4 w-4")} />
                                </div>
                                <div className="flex flex-col">
                                  <span>{c.nomeCompleto}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{c.status}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button 
                    className="w-full" 
                    onClick={() => addParticipants()} 
                    disabled={selectedCandidates.length === 0 || isAddingParticipant}
                  >
                    {isAddingParticipant ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserPlus className="h-4 w-4 mr-2"/>}
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: LISTA DE CHAMADA */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Lista de Chamada
                </h3>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                  Total: {participantes.length}
                </span>
              </div>

              <ScrollArea className="flex-1">
                {participantes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground gap-3">
                    <div className="bg-muted p-4 rounded-full">
                      <UserPlus className="h-8 w-8 opacity-20" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Lista vazia</p>
                      <p className="text-sm opacity-70">Utilize o painel ao lado para adicionar participantes.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {participantes.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                            p.presente ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          )}>
                            {p.caso.nomeCompleto.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-none">{p.caso.nomeCompleto}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">ID: {p.caso.id.slice(0,8)}</p>
                          </div>
                        </div>

                        <Button
                          variant={p.presente ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateAttendance({ caseId: p.caso.id, presente: !p.presente })}
                          className={cn(
                            "h-8 text-xs min-w-[100px] transition-all",
                            p.presente 
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" 
                              : "text-muted-foreground hover:text-foreground"
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}