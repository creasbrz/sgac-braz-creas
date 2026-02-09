// frontend/src/components/agenda/NewAppointmentModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Check, ChevronsUpDown } from 'lucide-react'
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
  DialogClose,
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
import { format } from 'date-fns'

// ... (TYPE_COLORS e Schema mantidos iguais) ...

const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#3b82f6',
  'Visita': '#22c55e',
  'Retorno': '#f97316',
  'Reunião': '#8b5cf6',
  'Grupo': '#ec4899',
  'Outro': '#64748b'
}

const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'Título muito curto'),
  tipo: z.string().min(1, 'Selecione um tipo'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
  casoId: z.string().optional(),
  observacoes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

// ... (CaseCombobox mantido igual, omitido para brevidade) ...
function CaseCombobox({ value, onChange, disabled }: { value?: string, onChange: (val: string) => void, disabled?: boolean }) {
    // ... código do combobox ...
    const [open, setOpen] = useState(false)
    const { data, isLoading } = useQuery({ 
      queryKey: ['cases', 'select-list'],
      queryFn: async () => (await api.get('/cases', { params: { pageSize: 50, sort: 'nomeCompleto:asc' } })).data,
      staleTime: 1000 * 60 * 10
    })

    const cases = useMemo(() => {
      if (!data) return []
      if (Array.isArray(data)) return data
      // @ts-ignore
      if (Array.isArray(data.items)) return data.items
      // @ts-ignore
      if (Array.isArray(data.data)) return data.data
      return []
    }, [data]) as any[]

    const selectedCase = cases.find((c) => c.id === value)

    return (
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal bg-background hover:bg-accent hover:text-accent-foreground h-10", !value && "text-muted-foreground")}
            disabled={disabled || isLoading}
          >
            {isLoading ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</span> : selectedCase ? selectedCase.nomeCompleto : "Vincular a um prontuário (Opcional)"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-75 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar assistido..." />
            <CommandList>
              <CommandEmpty>Nenhum prontuário encontrado.</CommandEmpty>
              <CommandGroup>
                {cases.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.nomeCompleto}
                    onSelect={() => { onChange(c.id); setOpen(false); }}
                    className="cursor-pointer"
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                    {c.nomeCompleto}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
}

interface NewAppointmentModalProps {
  open: boolean
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
  
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    // Valores padrão "seguros" para hidratação inicial
    defaultValues: {
      titulo: '',
      tipo: 'Atendimento',
      data: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      casoId: '',
      observacoes: '',
    },
  })

  // REACT 19 / MODERN PATTERN: Reset when modal opens
  // Em vez de 'useEffect' complexos com 'setValue', resetamos o form inteiro
  // quando a prop 'open' muda para true, usando os defaults mais recentes.
  useEffect(() => {
    if (open) {
      reset({
        titulo: '',
        tipo: 'Atendimento',
        data: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: defaultTime || '09:00',
        casoId: defaultCaseId || '',
        observacoes: '',
      })
    }
  }, [open, defaultDate, defaultTime, defaultCaseId, reset])

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const dateTimeString = `${data.data}T${data.time}:00`
      const isoDate = new Date(dateTimeString).toISOString()

      return await api.post('/appointments', {
        titulo: data.titulo,
        tipo: data.tipo,
        casoId: data.casoId || null, // Garante null se string vazia
        observacoes: data.observacoes,
        data: isoDate,
      })
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['myAgendaStats'] }) // Atualiza widget da home
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar agendamento.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>
            Registre um novo atendimento individual ou visita.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => createAppointment(data))} className="space-y-5 py-2">
          
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título da Atividade</Label>
              <Controller
                name="titulo" control={control}
                render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} className="font-medium bg-background h-10" />}
              />
              {errors.titulo && <p className="text-xs text-destructive font-medium">{errors.titulo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="tipo" control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-background h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(TYPE_COLORS).map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: TYPE_COLORS[type] }} />
                              {type}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Controller
                name="data" control={control}
                render={({ field }) => <Input type="date" {...field} className="bg-background h-10" />}
              />
              {errors.data && <p className="text-xs text-destructive font-medium">{errors.data.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Controller
                name="time" control={control}
                render={({ field }) => <Input type="time" {...field} className="bg-background h-10" />}
              />
              {errors.time && <p className="text-xs text-destructive font-medium">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assistido (Opcional)</Label>
            <Controller
              name="casoId" control={control}
              render={({ field }) => (
                <CaseCombobox value={field.value} onChange={field.onChange} disabled={!!defaultCaseId} />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Controller
              name="observacoes" control={control}
              render={({ field }) => (
                <Textarea 
                  placeholder="Detalhes adicionais para a equipe..." 
                  className="resize-none min-h-20 bg-muted/20 focus:bg-background transition-colors" 
                  {...field} 
                />
              )}
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="hover:bg-muted">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="min-w-28 font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {isPending ? "Salvando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}