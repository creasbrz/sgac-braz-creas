// frontend/src/components/agenda/NewAppointmentModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Calendar, Clock, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Tipos de atendimento (Cores)
const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#2563eb', // Azul
  'Visita': '#16a34a',      // Verde
  'Retorno': '#f97316',     // Laranja
  'Reunião': '#9333ea',     // Roxo
  'Outro': '#64748b'        // Cinza
}

// Schema do formulário
const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  tipo: z.string().default('Atendimento'),
  data: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida.'),
  casoId: z.string().uuid('Selecione um caso válido.'),
  observacoes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface NewAppointmentModalProps {
  open: boolean // [CORREÇÃO] Adicionada prop explícita 'open'
  onOpenChange: (isOpen: boolean) => void
  defaultCaseId?: string | null
  defaultDate?: string
  defaultTime?: string
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  defaultCaseId,
  defaultDate,
  defaultTime
}: NewAppointmentModalProps) {
  const queryClient = useQueryClient()
  
  // Controle do Combobox
  const [openCombobox, setOpenCombobox] = useState(false)

  // Busca casos (Otimização: pageSize razoável, idealmente deveria ser paginado via API no combobox, mas vamos manter simples por enquanto)
  const { data: casesResponse, isLoading: isLoadingCases } = useQuery({
    queryKey: ['cases', 'select-list'],
    queryFn: async () => {
      const response = await api.get('/cases', { params: { pageSize: 1000 } }) // Limite seguro
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  })

  const cases = useMemo(() => {
    if (!casesResponse) return []
    return Array.isArray(casesResponse) ? casesResponse : (casesResponse.data || casesResponse.items || [])
  }, [casesResponse])

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      titulo: '',
      tipo: 'Atendimento',
      data: defaultDate || '',
      time: defaultTime || '09:00',
      casoId: defaultCaseId ?? '',
      observacoes: '',
    },
  })

  // Sincroniza props externas com o form
  useEffect(() => {
    if (open) {
      if (defaultCaseId) setValue('casoId', defaultCaseId)
      if (defaultDate) setValue('data', defaultDate)
      if (defaultTime) setValue('time', defaultTime)
    }
  }, [open, defaultCaseId, defaultDate, defaultTime, setValue])

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      // Formatação de data segura
      const dateTimeString = `${data.data}T${data.time}:00`
      const isoDate = new Date(dateTimeString).toISOString()

      return await api.post('/appointments', {
        titulo: data.titulo,
        tipo: data.tipo, // [NOVO] Enviando tipo
        casoId: data.casoId,
        observacoes: data.observacoes,
        data: isoDate,
      })
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['myAgendaStats'] })
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar agendamento.'))
    },
  })

  // Helper para obter nome do caso selecionado no botão do combobox
  const selectedCaseId = watch('casoId')
  const selectedCaseName = cases.find((c: any) => c.id === selectedCaseId)?.nomeCompleto

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>
            Registre um novo atendimento individual ou visita.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => createAppointment(data))} className="space-y-5 py-2">
          
          {/* Título e Tipo */}
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título da Atividade</Label>
              <Controller
                name="titulo"
                control={control}
                render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} />}
              />
              {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(TYPE_COLORS).map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                              {type}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Combobox de Caso (Substitui Select simples) */}
              <div className="space-y-1.5">
                <Label>Vincular Caso</Label>
                <Controller
                  name="casoId"
                  control={control}
                  render={({ field }) => (
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!!defaultCaseId || isLoadingCases}
                        >
                          {selectedCaseName || "Selecione..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar nome..." />
                          <CommandList>
                            <CommandEmpty>Nenhum caso encontrado.</CommandEmpty>
                            <CommandGroup>
                              {cases.map((c: any) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.nomeCompleto}
                                  onSelect={() => {
                                    field.onChange(c.id)
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === c.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {c.nomeCompleto}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.casoId && <p className="text-xs text-destructive">{errors.casoId.message}</p>}
              </div>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data" className="flex items-center gap-2">
                 <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Data
              </Label>
              <Controller
                name="data"
                control={control}
                render={({ field }) => <Input type="date" id="data" {...field} />}
              />
              {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time" className="flex items-center gap-2">
                 <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Hora
              </Label>
              <Controller
                name="time"
                control={control}
                render={({ field }) => <Input type="time" id="time" {...field} />}
              />
              {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Controller
              name="observacoes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="observacoes"
                  placeholder="Detalhes adicionais sobre o atendimento..."
                  className="resize-none min-h-[80px]"
                  {...field}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}