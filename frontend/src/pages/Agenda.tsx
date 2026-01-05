import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm, type SubmitHandler, Controller, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Loader2, Calendar as CalendarIcon, Plus,
  ChevronRight, Tag, Users
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
import { Badge } from '@/components/ui/badge'

// Cores
const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#2563eb', // Azul
  'Visita': '#16a34a',      // Verde
  'Retorno': '#f97316',     // Laranja
  'Reunião': '#9333ea',     // Roxo
  'Grupo': '#7c3aed',       // Roxo Escuro
  'Outro': '#64748b'        // Cinza
}

// --- SCHEMA DO FORMULÁRIO ---
const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM).'),
  tipo: z.string().optional().default('Atendimento'),
  casoId: z.string().uuid('Selecione um caso.'),
  observacoes: z.string().optional().default(''),
})

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

  // Busca lista de casos para o select
  const { data: casesResponse } = useQuery({ 
    queryKey: ['cases', 'all-select'],
    queryFn: async () => {
      const response = await api.get('/cases', { params: { pageSize: 100 } })
      return response.data
    },
    staleTime: 1000 * 60 * 5
  })

  // [CORREÇÃO CRÍTICA] Verifica se é array direto OU se está dentro de .data/.items
  const cases: any[] = useMemo(() => {
    if (!casesResponse) return []
    if (Array.isArray(casesResponse)) return casesResponse
    return casesResponse.data || casesResponse.items || []
  }, [casesResponse])

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
        tipo: data.tipo,
      })
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
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
          <DialogTitle>Novo Agendamento Individual</DialogTitle>
          <DialogDescription>Para grupos e oficinas, use a aba "Grupos".</DialogDescription>
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
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TYPE_COLORS).filter(t => t !== 'Grupo').map(type => (
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
                     <SelectValue placeholder={cases.length > 0 ? "Selecione um caso..." : "Nenhum caso disponível"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c: any) => (
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
                <Textarea placeholder="Detalhes adicionais..." className="resize-none" {...field} value={field.value} />
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

// --- MODAL DE DETALHES ---
function EventDetailModal({ event, onClose }: { event: any, onClose: () => void }) {
  if (!event) return null

  const { resourceId, description, type } = event.extendedProps
  const isGroup = type === 'GRUPO'
  const linkTo = isGroup ? ROUTES.GROUPS : ROUTES.CASE_DETAIL(resourceId)

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: event.backgroundColor }}></span>
            {event.title}
            {isGroup && <Badge variant="secondary" className="ml-2">COLETIVO</Badge>}
          </DialogTitle>
          <DialogDescription>
            {event.start ? format(event.start, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isGroup ? (
             <div className="bg-muted/30 p-3 rounded-md text-sm border border-l-4 border-l-purple-500">
               <div className="flex items-center gap-2 font-semibold mb-1">
                 <Users className="h-4 w-4" /> Atividade Coletiva
               </div>
               <p className="mb-2">Esta é uma atividade de grupo.</p>
               <Button asChild size="sm" variant="outline" className="w-full">
                 <Link to={ROUTES.GROUPS}>Ir para Gestão de Grupos</Link>
               </Button>
             </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Link Rápido</Label>
              <p className="font-medium text-base">
                {resourceId ? (
                  <Link to={linkTo} className="hover:underline text-primary flex items-center gap-1">
                    Ver Detalhes do Caso / Grupo <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : 'Sem vínculo'}
              </p>
            </div>
          )}

          {description && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase">Detalhes/Observações</Label>
              <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{description}</p>
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

// --- COMPONENTE PRINCIPAL ---
export function Agenda() {
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  // [CORREÇÃO] Recebe os dados brutos e trata dentro do componente
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const response = await api.get('/appointments', {
        params: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString()
        }
      })
      return response.data
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5 
  })

  // [CORREÇÃO CRÍTICA] Normaliza a lista de agendamentos (Array vs Objeto)
  const appointments: any[] = useMemo(() => {
    if (!appointmentsData) return []
    if (Array.isArray(appointmentsData)) return appointmentsData
    return appointmentsData.data || appointmentsData.items || []
  }, [appointmentsData])

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

  const calendarEvents = useMemo(() => {
    return appointments.map((app: any) => {
      let color = TYPE_COLORS['Outro']
      
      if (app.type === 'GRUPO') {
        color = TYPE_COLORS['Grupo']
      } else {
        const lowerTitle = app.title?.toLowerCase?.() ?? ''
        if (lowerTitle.includes('visita')) color = TYPE_COLORS['Visita']
        else if (lowerTitle.includes('atendimento')) color = TYPE_COLORS['Atendimento']
        else if (lowerTitle.includes('reunião')) color = TYPE_COLORS['Reunião']
        else if (lowerTitle.includes('retorno')) color = TYPE_COLORS['Retorno']
      }

      // [CORREÇÃO] Aceita 'start' ou 'data' como propriedade de data
      const eventStart = app.start || app.data

      return {
        id: app.id,
        title: app.title,
        start: eventStart,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          type: app.type,
          description: app.description,
          resourceId: app.resourceId
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

  const handleDatesSet = (arg: { start: Date; end: Date }) => {
    setDateRange({ start: arg.start, end: arg.end })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" /> Agenda Integrada
          </h1>
          <p className="text-muted-foreground">Atendimentos individuais e atividades coletivas.</p>
        </div>

        <div className="flex items-center gap-3">
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
          datesSet={handleDatesSet}
        />
      </div>

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