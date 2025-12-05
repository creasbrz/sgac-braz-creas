// frontend/src/pages/Agenda.tsx
import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm, type SubmitHandler, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Loader2, Calendar as CalendarIcon, Plus,
  ChevronRight, Tag
} from 'lucide-react'

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { combineDateAndTime } from '@/utils/date'
import { FullCalendarWidget } from '@/components/agenda/FullCalendarWidget'
import { ROUTES } from '@/constants/routes'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// --- CONFIGURAÇÃO VISUAL ---
const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#2563eb', // Azul
  'Visita': '#16a34a',      // Verde
  'Retorno': '#f97316',     // Laranja
  'Reunião': '#9333ea',     // Roxo
  'Outro': '#64748b'        // Cinza
}

// --- SCHEMA (Opção A: moderna) ---
// Usamos .optional().default(...) + .transform(...) para garantir que a *SAÍDA* do schema seja `string`
// e assim `z.infer` produza tipos sem `undefined`.
const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM).'),

  tipo: z.string()
    .optional()
    .default('Atendimento')
    .transform((v) => (v ?? 'Atendimento')),

  casoId: z.string().uuid('Selecione um caso.'),

  observacoes: z.string()
    .optional()
    .default('')
    .transform((v) => (v ?? '')),
})

// Tipo inferido a partir do schema — garantido sem `undefined` nos campos que precisam ser obrigatórios.
type AppointmentFormData = z.infer<typeof appointmentFormSchema>

// --- MODAL DE NOVO AGENDAMENTO ---
function NewAppointmentModal({
  open,
  onOpenChange,
  defaultCaseId,
  defaultDate,
  defaultTime
}: {
  open: boolean
  onOpenChange: (isOpen: boolean) => void
  defaultCaseId?: string | null
  defaultDate?: string
  defaultTime?: string
}) {
  const queryClient = useQueryClient()

  const { data: casesResponse } = useQuery<{ items: { id: string, nomeCompleto: string }[] }>( {
    queryKey: ['cases', 'all-select'],
    queryFn: async () => {
      const response = await api.get('/cases', { params: { pageSize: 100 } })
      return response.data
    },
    staleTime: 1000 * 60 * 5
  })

  const cases = casesResponse?.items || []

  // OBS: para evitar o erro de compatibilidade de tipos entre zodResolver e react-hook-form,
  // fazemos um cast do resolver para o tipo Resolver<AppointmentFormData>.
  // Isso é seguro porque nosso schema, via transform(), garante os tipos de saída.
  const resolver = zodResolver(appointmentFormSchema) as unknown as Resolver<AppointmentFormData>

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    resolver,
    defaultValues: {
      titulo: '',
      data: defaultDate || '',
      time: defaultTime || '09:00',
      tipo: 'Atendimento',
      casoId: defaultCaseId ?? '',
      observacoes: '',
    },
  })

  // Atualiza o form quando abre o modal com dados pré-definidos
  useEffect(() => {
    if (open) {
      if (defaultCaseId) setValue('casoId', defaultCaseId)
      if (defaultDate) setValue('data', defaultDate)
      if (defaultTime) setValue('time', defaultTime)
    }
  }, [open, defaultCaseId, defaultDate, defaultTime, setValue])

  const { mutate: createAppointment, isPending: isCreating } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const isoDate = combineDateAndTime(data.data, data.time)
      return await api.post('/appointments', {
        titulo: data.titulo,
        casoId: data.casoId,
        observacoes: data.observacoes || null,
        data: isoDate,
      })
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['myAgendaStats'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar agendamento.'))
    },
  })

  const onSubmit: SubmitHandler<AppointmentFormData> = (data) => createAppointment(data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>Preencha os detalhes do atendimento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Controller
              name="titulo"
              control={control}
              render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} />}
            />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Controller
                name="data"
                control={control}
                render={({ field }) => <Input type="date" id="data" {...field} />}
              />
              {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Controller
                name="time"
                control={control}
                render={({ field }) => <Input type="time" id="time" {...field} />}
              />
              {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Agenda (Visual)</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(TYPE_COLORS).map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Vincular ao Caso</Label>
            <Controller
              name="casoId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!!defaultCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um caso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nomeCompleto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.casoId && <p className="text-xs text-destructive">{errors.casoId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Controller
              name="observacoes"
              control={control}
              render={({ field }) => (
                <Textarea
                  placeholder="Detalhes adicionais..."
                  className="resize-none"
                  {...field}
                  value={field.value}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- MODAL DE DETALHES DO EVENTO ---
function EventDetailModal({ event, onClose }: { event: any, onClose: () => void }) {
  if (!event) return null

  // Recupera dados extendidos
  const { casoId, nomeCompleto, observacoes } = event.extendedProps

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: event.backgroundColor }}></span>
            {event.title}
          </DialogTitle>
          <DialogDescription>
            {event.start ? format(event.start, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground uppercase">Usuário / Caso</Label>
            <p className="font-medium text-base">
              {nomeCompleto ? (
                <Link to={ROUTES.CASE_DETAIL(casoId)} className="hover:underline text-primary flex items-center gap-1">
                  {nomeCompleto} <ChevronRight className="h-3 w-3" />
                </Link>
              ) : 'N/A'}
            </p>
          </div>

          {observacoes && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Observações</Label>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{observacoes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- PÁGINA PRINCIPAL ---
export function Agenda() {
  // Estados do FullCalendar
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'all'],
    queryFn: async () => {
      const response = await api.get('/appointments', { params: { pageSize: 500 } })
      return response.data
    },
    staleTime: 1000 * 60 * 2
  })

  // Estados dos Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const [searchParams] = useSearchParams()
  const defaultCaseId = searchParams.get('caseId')

  useEffect(() => {
    if (defaultCaseId) {
      setIsCreateOpen(true)
    }
  }, [defaultCaseId])

  // Transforma dados da API para o formato do FullCalendar
  const calendarEvents = useMemo(() => {
    return appointments.map((app: any) => {
      let color = TYPE_COLORS['Outro']
      const lowerTitle = app.titulo?.toLowerCase?.() ?? ''

      if (lowerTitle.includes('visita')) color = TYPE_COLORS['Visita']
      else if (lowerTitle.includes('atendimento')) color = TYPE_COLORS['Atendimento']
      else if (lowerTitle.includes('reunião')) color = TYPE_COLORS['Reunião']
      else if (lowerTitle.includes('retorno')) color = TYPE_COLORS['Retorno']

      return {
        id: app.id,
        title: app.titulo,
        start: app.data,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          casoId: app.caso?.id,
          nomeCompleto: app.caso?.nomeCompleto,
          observacoes: app.observacoes,
          telefone: app.caso?.telefone
        }
      }
    })
  }, [appointments])

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setIsCreateOpen(true)
  }

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" /> Agenda
          </h1>
          <p className="text-muted-foreground">Visão completa dos atendimentos.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* LEGENDA (Popover) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tag className="h-4 w-4" /> Legenda
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-3">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-xs text-muted-foreground uppercase mb-2">Tipos</h4>
                {Object.entries(TYPE_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    {name}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button size="lg" className="shadow-sm" onClick={() => { setSelectedDate(undefined); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-5 w-5" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* FULLCALENDAR (Ocupa o resto da tela) */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : null}

        <FullCalendarWidget
          events={calendarEvents}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      </div>

      {/* MODAIS */}
      <NewAppointmentModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultCaseId={defaultCaseId}
        defaultDate={selectedDate}
        defaultTime="09:00"
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}
