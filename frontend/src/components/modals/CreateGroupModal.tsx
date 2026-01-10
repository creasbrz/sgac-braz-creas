// frontend/src/components/modals/CreateGroupModal.tsx    
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import { Plus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

const ORGAOS_LIST = ['Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 'CRAS', 'Defensoria Pública', 'MPDFT', 'Polícia Civil']

interface CreateGroupModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupModal({ isOpen, onOpenChange }: CreateGroupModalProps) {
  const queryClient = useQueryClient()

  // Estados locais do formulário
  const [newTheme, setNewTheme] = useState('')
  const [newType, setNewType] = useState('OFICINA')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [tempDate, setTempDate] = useState('')
  const [newLocal, setNewLocal] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newOrgaos, setNewOrgaos] = useState<string[]>([])

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
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      resetForm()
    },
    onError: () => toast.error('Erro ao criar grupo.')
  })

  const resetForm = () => {
    setNewTheme('')
    setSelectedDates([])
    setTempDate('')
    setNewLocal('')
    setNewDesc('')
    setNewOrgaos([])
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">(Múltiplas datas = recorrente)</span>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createGroup()} disabled={isCreating || !newTheme || selectedDates.length === 0}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}