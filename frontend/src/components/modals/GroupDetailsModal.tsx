// frontend/src/components/modals/GroupDetailsModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { 
  Users, CheckCircle2, Loader2, UserPlus, X, 
  Printer, FileText, Calendar, AlertCircle, Check, ChevronsUpDown, Info
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"

import { generateGroupAttendancePDF } from '@/utils/pdfGenerator'
import type { GroupActivity } from '@/types/group'

interface GroupDetailsModalProps {
  group: GroupActivity | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupDetailsModal({ group, isOpen, onOpenChange }: GroupDetailsModalProps) {
  const queryClient = useQueryClient()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  const { data: groupDetails, isLoading: isLoadingDetails } = useQuery<GroupActivity>({
    queryKey: ['group', group?.id],
    queryFn: async () => (await api.get(`/groups/${group?.id}`)).data,
    enabled: !!group && isOpen
  })

  const { data: activeCasesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['group-candidates', group?.id],
    queryFn: async () => {
      if (!group) return []
      const res = await api.get(`/groups/${group.id}/candidates`)
      return res.data
    },
    enabled: !!group && isOpen,
  })

  const { mutate: updateAttendance } = useMutation({
    mutationFn: async ({ caseId, presente }: { caseId: string, presente: boolean }) => {
      if (!group) return
      await api.patch(`/groups/${group.id}/attendance/${caseId}`, { presente })
    },
    onSuccess: (_, variables) => {
      // [CORREÇÃO] Atualiza tanto o detalhe quanto a lista principal
      queryClient.invalidateQueries({ queryKey: ['group', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] }) 
      
      toast.success(variables.presente ? 'Presença confirmada.' : 'Presença removida.')
    }
  })

  const { mutate: addParticipants, isPending: isAddingParticipant } = useMutation({
    mutationFn: async () => {
      if (!group || selectedCandidates.length === 0) return
      await api.post(`/groups/${group.id}/participants`, {
        caseIds: selectedCandidates
      })
    },
    onSuccess: (data: any) => {
      toast.success(data?.data?.message || 'Participantes incluídos!')
      setSelectedCandidates([]) 
      setOpenCombobox(false)
      queryClient.invalidateQueries({ queryKey: ['group', group?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] }) // Atualiza contagem na lista
      queryClient.invalidateQueries({ queryKey: ['group-candidates', group?.id] })
    },
    onError: () => toast.error('Erro ao adicionar participantes.')
  })

  const toggleCandidate = (caseId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId) 
        : [...prev, caseId]
    )
  }

  const handlePrint = (type: 'blank' | 'filled') => {
    if (group && groupDetails?.participantes) {
      generateGroupAttendancePDF(group, groupDetails.participantes, type)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {group?.tema} 
            <Badge variant="secondary" className="ml-2 font-normal text-xs">{group?.tipo.replace('_', ' ')}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {group?.orgaosEnvolvidos && group.orgaosEnvolvidos.length > 0 ? (
                <span className="flex gap-1 text-xs items-center"><Users className="h-3 w-3 mr-1"/> Parceiros: {group.orgaosEnvolvidos.join(', ')}</span>
            ) : <span>Detalhes da atividade e gestão de participantes</span>}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            
            {/* MÉTRICAS DE TOPO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs border rounded-lg p-2 bg-muted/20">
              <div className="p-2 flex flex-col items-center justify-center">
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3"/> Data</span>
                <span className="font-medium">{group?.dataRealizacao ? format(new Date(group.dataRealizacao), "dd/MM/yy HH:mm") : '-'}</span>
              </div>
              <div className="p-2 border-l border-border/50 flex flex-col items-center justify-center">
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Users className="h-3 w-3"/> Inscritos</span>
                <span className="font-bold text-lg">{groupDetails?.participantes?.length || 0}</span>
              </div>
              <div className="p-2 border-l border-border/50 flex flex-col items-center justify-center">
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><CheckCircle2 className="h-3 w-3 text-emerald-500"/> Presentes</span>
                <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{groupDetails?.participantes?.filter(p => p.presente).length || 0}</span>
              </div>
              <div className="p-2 border-l border-border/50 flex flex-col items-center justify-center">
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><AlertCircle className="h-3 w-3"/> Ausentes</span>
                <span className="font-bold text-lg text-muted-foreground">{groupDetails?.participantes?.filter(p => !p.presente).length || 0}</span>
              </div>
            </div>

            {/* AÇÕES DE DOCUMENTAÇÃO */}
            <div className="bg-muted/10 p-3 rounded-lg border border-dashed space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint('blank')}>
                    <Printer className="mr-2 h-4 w-4 text-muted-foreground" /> Lista de Assinatura
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint('filled')}>
                    <FileText className="mr-2 h-4 w-4 text-primary" /> Relatório Consolidado
                </Button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <Info className="h-3 w-3"/> Documentos válidos para prestação de contas.
              </p>
            </div>

            {/* MULTI-SELECT DE PARTICIPANTES */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex justify-between items-end">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Adicionar Participantes</Label>
                  {selectedCandidates.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{selectedCandidates.length} selecionados</Badge>
                  )}
              </div>

              <div className="flex flex-col gap-2">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between h-auto min-h-[42px] py-2 px-3 text-left"
                      disabled={isLoadingCandidates}
                    >
                      <div className="flex flex-wrap gap-1">
                        {selectedCandidates.length > 0 ? (
                          selectedCandidates.map(id => {
                            const person = activeCasesData?.find((c: any) => c.id === id)
                            return (
                              <Badge key={id} variant="secondary" className="mr-1 mb-1">
                                {person?.nomeCompleto.split(' ')[0]}
                                <div
                                  className="ml-1 rounded-full cursor-pointer hover:bg-destructive/20"
                                  onClick={(e) => { e.stopPropagation(); toggleCandidate(id) }}
                                >
                                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </div>
                              </Badge>
                            )
                          })
                        ) : (
                            <span className="text-muted-foreground text-sm font-normal">
                              {isLoadingCandidates ? "Carregando candidatos..." : "Pesquisar e selecionar usuários..."}
                            </span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Digite o nome..." />
                      <CommandList>
                        <CommandEmpty>Nenhum caso elegível encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {activeCasesData && activeCasesData.map((c: any) => (
                            <CommandItem
                              key={c.id}
                              value={c.nomeCompleto}
                              onSelect={() => toggleCandidate(c.id)}
                            >
                              <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selectedCandidates.includes(c.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              {c.nomeCompleto}
                              <span className="ml-2 text-[10px] text-muted-foreground">({c.status})</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button 
                  size="sm" 
                  className="w-full sm:w-auto self-end"
                  onClick={() => addParticipants()} 
                  disabled={selectedCandidates.length === 0 || isAddingParticipant}
                >
                  {isAddingParticipant ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <UserPlus className="h-4 w-4 mr-2"/>}
                  {selectedCandidates.length > 0 ? `Incluir ${selectedCandidates.length} Participantes` : 'Incluir Selecionados'}
                </Button>
              </div>
            </div>
            
            {/* LISTA DE CHAMADA */}
            <div className="flex-1 overflow-hidden border rounded-md flex flex-col bg-background">
              <div className="bg-muted/50 p-2 text-xs font-semibold text-muted-foreground uppercase border-b flex justify-between items-center">
                <span>Lista de Chamada</span>
                <span className="text-[10px] font-normal">{groupDetails?.participantes?.length} nomes</span>
              </div>
              <ScrollArea className="flex-1">
                {groupDetails?.participantes?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Users className="h-8 w-8 opacity-20" />
                    <p>Nenhum participante vinculado ainda.</p>
                  </div>
                ) : (
                  <div className="divide-y dark:divide-white/10">
                    {groupDetails?.participantes?.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/5 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{p.caso.nomeCompleto}</span>
                          <span className="text-[10px] text-muted-foreground">ID: {p.caso.id.slice(0, 8)}...</span>
                        </div>
                        
                        <button 
                          onClick={() => updateAttendance({ caseId: p.caso.id, presente: !p.presente })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border 
                            ${p.presente 
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/50' 
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800'}`}
                        >
                          {p.presente ? <CheckCircle2 className="h-3.5 w-3.5"/> : <X className="h-3.5 w-3.5"/>}
                          {p.presente ? 'PRESENTE' : 'AUSENTE'}
                        </button>
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