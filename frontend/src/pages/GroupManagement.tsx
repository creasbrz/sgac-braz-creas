import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isFuture, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Users, Plus, MapPin, CheckCircle2, Loader2, UserPlus, X, 
  Printer, FileText, CalendarDays, Check, ChevronsUpDown, Info,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList 
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { generateGroupAttendancePDF } from '@/utils/pdfGenerator'
import type { GroupActivity } from '@/types/group'

const ORGAOS_LIST = ['Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 'CRAS', 'Defensoria Pública', 'MPDFT', 'Polícia Civil']

export function GroupManagement() {
  const queryClient = useQueryClient()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupActivity | null>(null)
  
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  const [newTheme, setNewTheme] = useState('')
  const [newType, setNewType] = useState('OFICINA')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [tempDate, setTempDate] = useState('')
  
  const [newLocal, setNewLocal] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newOrgaos, setNewOrgaos] = useState<string[]>([])

  const { data: groups = [], isLoading } = useQuery<GroupActivity[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data
  })

  const { data: groupDetails, isLoading: isLoadingDetails } = useQuery<GroupActivity>({
    queryKey: ['group', selectedGroup?.id],
    queryFn: async () => (await api.get(`/groups/${selectedGroup?.id}`)).data,
    enabled: !!selectedGroup
  })

  const { data: activeCasesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['group-candidates', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return []
      const res = await api.get(`/groups/${selectedGroup.id}/candidates`)
      return res.data
    },
    enabled: !!selectedGroup,
  })

  const { mutate: createGroup, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      await api.post('/groups', {
        tema: newTheme,
        tipo: newType,
        datas: selectedDates,
        local: newLocal,
        descricao: newDesc,
        orgaosEnvolvidos: newOrgaos
      })
    },
    onSuccess: () => {
      toast.success('Atividade(s) criada(s)!')
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setNewTheme(''); setSelectedDates([]); setTempDate(''); setNewLocal(''); setNewDesc(''); setNewOrgaos([])
    },
    onError: () => toast.error('Erro ao criar grupo.')
  })

  const { mutate: updateAttendance } = useMutation({
    mutationFn: async ({ caseId, presente }: { caseId: string, presente: boolean }) => {
      if (!selectedGroup) return
      await api.patch(`/groups/${selectedGroup.id}/attendance/${caseId}`, { presente })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup?.id] })
      // [UX] Feedback específico da ação
      toast.success(variables.presente ? 'Presença confirmada.' : 'Presença removida.')
    }
  })

  const { mutate: addParticipants, isPending: isAddingParticipant } = useMutation({
    mutationFn: async () => {
      if (!selectedGroup || selectedCandidates.length === 0) return
      await api.post(`/groups/${selectedGroup.id}/participants`, {
        caseIds: selectedCandidates
      })
    },
    onSuccess: (data: any) => {
      toast.success(data?.data?.message || 'Participantes incluídos!')
      setSelectedCandidates([]) 
      setOpenCombobox(false)
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-candidates', selectedGroup?.id] })
    },
    onError: () => toast.error('Erro ao adicionar participantes.')
  })

  const toggleOrgao = (orgao: string) => {
    setNewOrgaos(prev => prev.includes(orgao) ? prev.filter(o => o !== orgao) : [...prev, orgao])
  }

  const handleAddDate = () => {
    if (tempDate && !selectedDates.includes(tempDate)) {
      setSelectedDates(prev => [...prev, tempDate].sort()) 
      setTempDate('')
    }
  }

  const handleRemoveDate = (dateToRemove: string) => {
    setSelectedDates(prev => prev.filter(d => d !== dateToRemove))
  }

  const handlePrint = (type: 'blank' | 'filled') => {
    if (selectedGroup && groupDetails?.participantes) {
      generateGroupAttendancePDF(selectedGroup, groupDetails.participantes, type)
    }
  }

  const toggleCandidate = (caseId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId) 
        : [...prev, caseId]
    )
  }

  const getGroupStatusColor = (group: GroupActivity) => {
    const date = new Date(group.dataRealizacao)
    const isFutureDate = isFuture(date) || isToday(date)
    
    if (isFutureDate) {
      return { 
        border: 'bg-blue-500', 
        bg: 'hover:border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50', 
        badge: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
        label: 'Agendado'
      }
    }
    
    if (group.attendanceConfirmed) {
      return { 
        border: 'bg-emerald-500', 
        bg: 'hover:border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50', 
        badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
        label: 'Realizado'
      }
    }

    return { 
      border: 'bg-amber-500', 
      bg: 'hover:border-amber-300 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50', 
      badge: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
      label: 'Pendente Chamada'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos e Oficinas</h1>
          <p className="text-muted-foreground">Gestão de atividades coletivas e lista de presença.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && <div className="col-span-3 text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div>}
        
        {groups.map((group) => {
          const statusStyle = getGroupStatusColor(group)

          return (
            <Card key={group.id} className={`cursor-pointer transition-all group overflow-hidden border ${statusStyle.bg}`} onClick={() => setSelectedGroup(group)}>
              
              <div className={`h-2 ${statusStyle.border} w-full`} />
              
              <CardHeader className="pb-3 pt-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-background text-[10px] font-normal uppercase tracking-wider">
                    {group.tipo.replace(/_/g, ' ')}
                  </Badge>
                  
                  <Badge variant="outline" className={`text-[10px] font-medium border ${statusStyle.badge}`}>
                      {statusStyle.label}
                  </Badge>
                </div>
                
                <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3rem] text-foreground/90">
                 {group.tema}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(group.dataRealizacao), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Tooltip para Local extenso */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/40 dark:bg-muted/10 p-2 rounded-md">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" /> 
                        <span className="truncate leading-tight">{group.local || 'Local não definido'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{group.local}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t dark:border-white/10">
                  <span className="truncate max-w-[140px] font-medium text-foreground/80">
                    Facilitador: {group.facilitador.nome.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full text-primary font-medium">
                    <Users className="h-3.5 w-3.5"/> 
                    <span>{group._count?.participantes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* DIALOG DE CRIAÇÃO */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
           <DialogHeader><DialogTitle>Nova Atividade Coletiva</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tema / Nome da Atividade</Label>
              <Input value={newTheme} onChange={e => setNewTheme(e.target.value)} placeholder="Ex: Oficina de Artes e Vínculos" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFICINA">Oficina</SelectItem>
                    <SelectItem value="GRUPO_PAEFI">Grupo PAEFI</SelectItem>
                    <SelectItem value="ACOLHIDA_COLETIVA">Acolhida Coletiva</SelectItem>
                    <SelectItem value="REUNIAO_REDE">Reunião de Rede</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={newLocal} onChange={e => setNewLocal(e.target.value)} placeholder="Ex: Sala 02" />
              </div>
            </div>

            <div className="space-y-2 border p-3 rounded-md bg-muted/20">
              <Label className="text-primary flex items-center gap-2">
                Datas de Realização 
                <span className="text-[10px] text-muted-foreground font-normal ml-auto">(Múltiplas datas = atividades recorrentes)</span>
              </Label>
              <div className="flex gap-2">
                <Input type="datetime-local" value={tempDate} onChange={e => setTempDate(e.target.value)} className="flex-1"/>
                <Button variant="secondary" onClick={handleAddDate} disabled={!tempDate}><Plus className="h-4 w-4" /></Button>
              </div>
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDates.map((date) => (
                    <Badge key={date} variant="outline" className="pl-2 pr-1 py-1 gap-1 bg-background">
                      {format(parseISO(date), "dd/MM HH:mm")}
                      <button onClick={() => handleRemoveDate(date)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição / Metodologia</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Objetivos e metodologia..." className="h-20"/>
            </div>
            
            <div className="space-y-2">
              <Label>Órgãos Parceiros Envolvidos</Label>
              <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                {ORGAOS_LIST.map(org => (
                  <div key={org} className="flex items-center space-x-2">
                    <Checkbox id={org} checked={newOrgaos.includes(org)} onCheckedChange={() => toggleOrgao(org)} />
                    <label htmlFor={org} className="text-sm cursor-pointer">{org}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createGroup()} disabled={isCreating || !newTheme || selectedDates.length === 0}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE DETALHES */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedGroup?.tema} 
              <Badge variant="secondary" className="ml-2 font-normal text-xs">{selectedGroup?.tipo.replace('_', ' ')}</Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {selectedGroup?.orgaosEnvolvidos && selectedGroup.orgaosEnvolvidos.length > 0 ? (
                 <span className="flex gap-1 text-xs items-center"><Users className="h-3 w-3 mr-1"/> Parceiros: {selectedGroup.orgaosEnvolvidos.join(', ')}</span>
              ) : <span>Detalhes da atividade e gestão de participantes</span>}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              
              {/* MÉTRICAS DE TOPO - COM ÍCONES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs border rounded-lg p-2 bg-muted/20">
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3"/> Data</span>
                  <span className="font-medium">{selectedGroup?.dataRealizacao ? format(new Date(selectedGroup.dataRealizacao), "dd/MM/yy HH:mm") : '-'}</span>
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
                  <Info className="h-3 w-3"/> Documentos válidos para prestação de contas e arquivo físico.
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
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleCandidate(id)
                                    }}
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
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
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    selectedCandidates.includes(c.id)
                                      ? "bg-primary text-primary-foreground"
                                      : "opacity-50 [&_svg]:invisible"
                                  )}
                                >
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
                            onClick={() => updateAttendance({ caseId: p.casoId, presente: !p.presente })}
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
    </div>
  )
}