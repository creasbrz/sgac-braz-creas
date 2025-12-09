// frontend/src/pages/GroupManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isFuture, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
// [CORREÇÃO] Removido 'Circle' e 'AlertCircle' (não estava sendo usado na lógica abaixo, só na importação)
import { Users, Plus, MapPin, CheckCircle2, Loader2, UserPlus, X, Printer, FileText, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// [CORREÇÃO] Removido 'CardDescription' da importação
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

import { generateGroupAttendancePDF } from '@/utils/pdfGenerator'
import type { GroupActivity } from '@/types/group'

const ORGAOS_LIST = ['Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 'CRAS', 'Defensoria Pública', 'MPDFT', 'Polícia Civil']

export function GroupManagement() {
  const queryClient = useQueryClient()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupActivity | null>(null)
  
  const [newTheme, setNewTheme] = useState('')
  const [newType, setNewType] = useState('OFICINA')
  const [newDate, setNewDate] = useState('')
  const [newLocal, setNewLocal] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newOrgaos, setNewOrgaos] = useState<string[]>([])

  const [participantToAdd, setParticipantToAdd] = useState('')

  const { data: groups = [], isLoading } = useQuery<GroupActivity[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data
  })

  const { data: groupDetails, isLoading: isLoadingDetails } = useQuery<GroupActivity>({
    queryKey: ['group', selectedGroup?.id],
    queryFn: async () => (await api.get(`/groups/${selectedGroup?.id}`)).data,
    enabled: !!selectedGroup
  })

  const { data: activeCasesData } = useQuery({
    queryKey: ['cases', 'active-select'],
    queryFn: async () => {
      const res = await api.get('/cases', { params: { pageSize: 100, view: 'all' } })
      return res.data.items
    },
    enabled: !!selectedGroup,
    staleTime: 1000 * 60 * 5
  })

  const { mutate: createGroup, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      await api.post('/groups', {
        tema: newTheme,
        tipo: newType,
        dataRealizacao: new Date(newDate).toISOString(),
        local: newLocal,
        descricao: newDesc,
        orgaosEnvolvidos: newOrgaos
      })
    },
    onSuccess: () => {
      toast.success('Atividade criada!')
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setNewTheme(''); setNewDate(''); setNewLocal(''); setNewDesc(''); setNewOrgaos([])
    },
    onError: () => toast.error('Erro ao criar grupo.')
  })

  const { mutate: updateAttendance } = useMutation({
    mutationFn: async ({ caseId, presente }: { caseId: string, presente: boolean }) => {
      if (!selectedGroup) return
      await api.patch(`/groups/${selectedGroup.id}/attendance/${caseId}`, { presente })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup?.id] })
      toast.success('Presença registrada.')
    }
  })

  const { mutate: addParticipant, isPending: isAddingParticipant } = useMutation({
    mutationFn: async () => {
      if (!selectedGroup || !participantToAdd) return
      await api.post(`/groups/${selectedGroup.id}/participants`, {
        caseIds: [participantToAdd]
      })
    },
    onSuccess: () => {
      toast.success('Participante incluído!')
      setParticipantToAdd('')
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup?.id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })

  const toggleOrgao = (orgao: string) => {
    setNewOrgaos(prev => prev.includes(orgao) ? prev.filter(o => o !== orgao) : [...prev, orgao])
  }

  const handlePrint = (type: 'blank' | 'filled') => {
    if (selectedGroup && groupDetails?.participantes) {
      generateGroupAttendancePDF(selectedGroup, groupDetails.participantes, type)
    }
  }

  const getGroupStatusColor = (group: GroupActivity) => {
    const date = new Date(group.dataRealizacao)
    const isFutureDate = isFuture(date) || isToday(date)
    
    if (isFutureDate) {
      return { 
        border: 'bg-blue-500', 
        bg: 'hover:border-blue-300', 
        badge: 'text-blue-700 bg-blue-50 border-blue-200',
        label: 'Agendado'
      }
    }
    
    if (group.attendanceConfirmed) {
      return { 
        border: 'bg-emerald-500', 
        bg: 'hover:border-emerald-300', 
        badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        label: 'Realizado'
      }
    }

    return { 
      border: 'bg-amber-500', 
      bg: 'hover:border-amber-300 border-amber-200 bg-amber-50/30', 
      badge: 'text-amber-700 bg-amber-50 border-amber-200',
      label: 'Pendente Chamada'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos e Oficinas</h1>
          <p className="text-muted-foreground">Gestão de atividades coletivas e lista de presença.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
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
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" /> 
                  <span className="truncate leading-tight">{group.local || 'Local não definido'}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <span className="truncate max-w-[140px] font-medium text-foreground/80">
                    Facilitador: {group.facilitador.nome.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-full text-primary font-medium">
                    <Users className="h-3.5 w-3.5"/> 
                    <span>{group._count?.participantes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
                <Label>Data de Realização</Label>
                <Input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={newLocal} onChange={e => setNewLocal(e.target.value)} placeholder="Ex: Sala de Reuniões CREAS" />
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
            <Button onClick={() => createGroup()} disabled={isCreating || !newTheme || !newDate}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGroup?.tema} 
              <Badge variant="secondary" className="ml-2 font-normal text-xs">{selectedGroup?.tipo.replace('_', ' ')}</Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {selectedGroup?.orgaosEnvolvidos && selectedGroup.orgaosEnvolvidos.length > 0 ? (
                 <span className="flex gap-1 text-xs">Parceiros: {selectedGroup.orgaosEnvolvidos.join(', ')}</span>
              ) : <span>Detalhes da atividade e participantes</span>}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs border rounded-lg p-2 bg-muted/20">
                <div className="p-2">
                  <span className="block text-muted-foreground">Data</span>
                  <span className="font-medium">{selectedGroup?.dataRealizacao ? format(new Date(selectedGroup.dataRealizacao), "dd/MM/yyyy HH:mm") : '-'}</span>
                </div>
                <div className="p-2 border-l">
                  <span className="block text-muted-foreground">Total Inscritos</span>
                  <span className="font-bold text-lg">{groupDetails?.participantes?.length || 0}</span>
                </div>
                <div className="p-2 border-l">
                  <span className="block text-muted-foreground">Presentes</span>
                  <span className="font-bold text-lg text-green-600">{groupDetails?.participantes?.filter(p => p.presente).length || 0}</span>
                </div>
                <div className="p-2 border-l">
                  <span className="block text-muted-foreground">Ausentes</span>
                  <span className="font-bold text-lg text-muted-foreground">{groupDetails?.participantes?.filter(p => !p.presente).length || 0}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint('blank')}>
                   <Printer className="mr-2 h-4 w-4 text-muted-foreground" />
                   Lista para Assinatura (Vazia)
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint('filled')}>
                   <FileText className="mr-2 h-4 w-4 text-primary" />
                   Relatório de Presença (Final)
                </Button>
              </div>

              <div className="flex items-end gap-2 p-3 bg-muted/40 rounded-lg border border-dashed">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Adicionar Família/Usuário ao Grupo</Label>
                  <Select value={participantToAdd} onValueChange={setParticipantToAdd}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Pesquisar caso ativo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCasesData && activeCasesData.length > 0 ? (
                        activeCasesData.map((c: any) => {
                          const isAlreadyInGroup = groupDetails?.participantes?.some(p => p.casoId === c.id)
                          if (isAlreadyInGroup) return null
                          return <SelectItem key={c.id} value={c.id}>{c.nomeCompleto}</SelectItem>
                        })
                      ) : (
                        <div className="p-2 text-xs text-muted-foreground text-center">Nenhum caso disponível...</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => addParticipant()} disabled={!participantToAdd || isAddingParticipant}>
                  {isAddingParticipant ? <Loader2 className="h-4 w-4 animate-spin"/> : <UserPlus className="h-4 w-4 mr-2"/>}
                  Incluir
                </Button>
              </div>
              
              <div className="flex-1 overflow-hidden border rounded-md flex flex-col">
                <div className="bg-muted/50 p-2 text-xs font-semibold text-muted-foreground uppercase border-b">
                  Lista de Chamada
                </div>
                <ScrollArea className="flex-1">
                  {groupDetails?.participantes?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <Users className="h-8 w-8 opacity-20" />
                      <p>Nenhum participante vinculado ainda.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {groupDetails?.participantes?.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/10 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{p.caso.nomeCompleto}</span>
                            <span className="text-[10px] text-muted-foreground">ID: {p.caso.id.slice(0, 8)}...</span>
                          </div>
                          
                          <button 
                            onClick={() => updateAttendance({ caseId: p.casoId, presente: !p.presente })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${p.presente ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
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