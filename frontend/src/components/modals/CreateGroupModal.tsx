// frontend/src/components/modals/CreateGroupModal.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { 
  Plus, Loader2, X, Calendar, Users, MapPin, 
  FileText, Building2, CalendarClock 
} from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label' 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'

const ORGAOS_LIST = [
  'Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 
  'CRAS', 'Defensoria Pública', 'MPDFT', 'Polícia Civil', 'CREAS'
]

const createGroupSchema = z.object({
  tema: z.string().min(3, "O tema deve ter pelo menos 3 caracteres"),
  tipo: z.string().min(1, "Selecione um tipo"),
  local: z.string().optional(),
  descricao: z.string().optional(),
  orgaosEnvolvidos: z.array(z.string()).default([]),
  datas: z.array(z.string()).min(1, "Adicione pelo menos uma data de realização")
})

type CreateGroupFormData = z.infer<typeof createGroupSchema>

interface CreateGroupModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupModal({ isOpen, onOpenChange }: CreateGroupModalProps) {
  const queryClient = useQueryClient()
  const [tempDate, setTempDate] = useState('')

  // [CORREÇÃO ERRO 2322]: Cast 'as any' no resolver para evitar conflito de tipos estritos
  const form = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema) as any,
    defaultValues: {
      tema: '',
      tipo: 'OFICINA',
      local: '',
      descricao: '',
      orgaosEnvolvidos: [],
      datas: []
    }
  })

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
      await api.post('/groups', data)
    },
    onSuccess: () => {
      toast.success('Atividade criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      handleClose()
    },
    onError: () => toast.error('Erro ao criar grupo.')
  })

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
    setTempDate('')
  }

  const onSubmit = (data: CreateGroupFormData) => {
    createGroup(data)
  }

  const handleAddDate = () => {
    if (!tempDate) return
    
    const currentDates = form.getValues('datas')
    if (!currentDates.includes(tempDate)) {
      const newDates = [...currentDates, tempDate].sort()
      form.setValue('datas', newDates, { shouldValidate: true })
      setTempDate('')
    } else {
      toast.warning("Esta data já foi adicionada.")
    }
  }

  const handleRemoveDate = (dateToRemove: string) => {
    const currentDates = form.getValues('datas')
    const newDates = currentDates.filter(d => d !== dateToRemove)
    form.setValue('datas', newDates, { shouldValidate: true })
  }

  const handleToggleOrgao = (orgao: string) => {
    const current = form.getValues('orgaosEnvolvidos')
    const updated = current.includes(orgao)
      ? current.filter(o => o !== orgao)
      : [...current, orgao]
    form.setValue('orgaosEnvolvidos', updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20 text-primary">
               <Users className="h-5 w-5" />
            </div>
            Nova Atividade Coletiva
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Crie oficinas, grupos PAEFI ou reuniões de rede e defina o cronograma.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            // [CORREÇÃO ERRO 2345]: Cast duplo para garantir compatibilidade no submit
            onSubmit={form.handleSubmit(onSubmit as any)} 
            className="flex-1 overflow-hidden flex flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                
                {/* DADOS BÁSICOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tema"
                    render={({ field }) => (
                      <FormItem className="col-span-1 md:col-span-2">
                        <FormLabel>Tema / Nome da Atividade</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Oficina de Vínculos Familiares" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Atividade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="OFICINA">Oficina</SelectItem>
                            <SelectItem value="GRUPO_PAEFI">Grupo PAEFI</SelectItem>
                            <SelectItem value="ACOLHIDA_COLETIVA">Acolhida Coletiva</SelectItem>
                            <SelectItem value="REUNIAO_REDE">Reunião de Rede</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="local"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Local
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Sala Multiuso 01" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* CRONOGRAMA */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/10 border-dashed border-primary/20">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-primary font-semibold">
                      <CalendarClock className="h-4 w-4" /> Cronograma
                    </Label>
                    <span className="text-xs text-muted-foreground">Obrigatório</span>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Data e Hora</span>
                      <Input 
                        type="datetime-local" 
                        value={tempDate} 
                        onChange={e => setTempDate(e.target.value)}
                        className="bg-background h-9 text-sm"
                      />
                    </div>
                    <Button type="button" size="sm" onClick={handleAddDate} disabled={!tempDate} className="h-9 px-3">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="datas"
                    render={({ field }) => (
                      <FormItem>
                        {field.value.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {field.value.map((date) => (
                              <Badge key={date} variant="secondary" className="pl-2.5 pr-1 py-1 gap-1.5 border bg-background/80 hover:bg-background">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(parseISO(date), "dd/MM 'às' HH:mm")}
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveDate(date)} 
                                  className="ml-1 hover:bg-destructive hover:text-white rounded-full p-0.5 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground/50 border-2 border-dashed rounded-md bg-background/50">
                            <Calendar className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs italic">Nenhuma data agendada.</p>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* DETALHES E PARCEIROS */}
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Metodologia / Objetivos
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva os objetivos da atividade e a metodologia a ser aplicada..." 
                            className="min-h-24 bg-background leading-relaxed" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Órgãos Parceiros
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 border rounded-lg bg-background/50">
                      {ORGAOS_LIST.map(org => (
                        <div key={org} className="flex items-center space-x-2">
                          <Checkbox 
                            id={org} 
                            checked={form.watch('orgaosEnvolvidos').includes(org)} 
                            onCheckedChange={() => handleToggleOrgao(org)} 
                          />
                          <label 
                            htmlFor={org} 
                            className="text-xs sm:text-sm cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none"
                          >
                            {org}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </ScrollArea>

            <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-32 shadow-sm">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Criar Atividade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}