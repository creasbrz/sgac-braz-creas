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
  ChevronRight, Tag, Users, Clock, FileText, Info
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
import { Separator } from '@/components/ui/separator'

// Cores Institucionais
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
    setValue  } = useForm<AppointmentFormData>({
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

        <form onSubmit={handleSubmit(onSubmit)} className="py-2 space-y-6">
          
          {/* BLOCO 1: O QUE E QUEM */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3 w-3" /> Contexto
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="titulo">Título da Atividade</Label>
                <Controller
                  name="titulo"
                  control={control}
                  render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} />}
                />
                {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Controller
                    name="tipo"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[field.value || 'Atendimento'] }} />
                              {field.value}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(TYPE_COLORS).filter(t => t !== 'Grupo').map(type => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                                {type}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Vincular Caso</Label>
                  <Controller
                    name="casoId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!defaultCaseId}>
                        <SelectTrigger>
                          <SelectValue placeholder={cases.length > 0 ? "Selecione..." : "Sem casos"} />
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
              </div>
            </div>
          </div>

          <Separator />

          {/* BLOCO 2: QUANDO */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3 w-3" /> Agendamento
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="data">Data</Label>
                <Controller
                  name="data"
                  control={control}
                  render={({ field }) => <Input type="date" id="data" {...field} />}
                />
                {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">Hora</Label>
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => <Input type="time" id="time" {...field} />}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
               <Label>Observações (Opcional)</Label>
              <Controller
                name="observacoes"
                control={control}
                render={({ field }) => (
                  <Textarea placeholder="Detalhes adicionais..." className="resize-none h-20 text-sm" {...field} value={field.value} />
                )}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isCreating} className="min-w-[120px]">
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

  // Cor sólida para o badge e cabeçalho
  const color = event.borderColor // Usamos a borda pois o bg é translúcido

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-bold border-2" style={{ borderColor: color, color: color }}>
              {isGroup ? 'COLETIVO' : type}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Data e Hora em Bloco Destacado */}
          <div className="bg-muted/30 p-3 rounded-lg border flex items-center gap-3">
            <div className="p-2 bg-background rounded-full border shadow-sm">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {event.start ? format(event.start, "EEEE, dd 'de' MMMM", { locale: ptBR }) : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {event.start ? format(event.start, "'Às' HH:mm", { locale: ptBR }) : ''}
              </p>
            </div>
          </div>

          {/* Links e Ações */}
          {isGroup ? (
             <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 space-y-3">
               <div className="flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300">
                 <Users className="h-4 w-4" /> Gestão de Grupo
               </div>
               <p className="text-sm text-muted-foreground">Para gerenciar presença e detalhes, acesse o módulo de grupos.</p>
               <Button asChild size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
                 <Link to={ROUTES.GROUPS}>Acessar Atividade Coletiva</Link>
               </Button>
             </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vínculo</Label>
              {resourceId ? (
                <Link to={linkTo} className="group block p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">Ver Prontuário do Caso</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground italic pl-1">Este agendamento não está vinculado a um caso.</p>
              )}
            </div>
          )}

          {description && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
                <Info className="h-3 w-3" /> Observações
              </Label>
              <p className="text-sm bg-muted/50 p-3 rounded-lg border whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between sm:gap-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">Fechar</Button>
          {!isGroup && resourceId && (
            <Button asChild size="sm">
              <Link to={linkTo}>Abrir Caso</Link>
            </Button>
          )}
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
        // Lógica de fallback para cores baseada no título se o tipo não for explícito
        const matchedType = Object.keys(TYPE_COLORS).find(t => lowerTitle.includes(t.toLowerCase()))
        if (matchedType) color = TYPE_COLORS[matchedType]
        else if (app.type && TYPE_COLORS[app.type]) color = TYPE_COLORS[app.type]
      }

      const eventStart = app.start || app.data

      return {
        id: app.id,
        title: app.title,
        start: eventStart,
        // ESTILO VISUAL: Translúcido com borda sólida (Mais elegante)
        backgroundColor: `${color}26`, // ~15% opacidade (Hex Code + 26)
        borderColor: color,
        textColor: color, 
        classNames: ['font-semibold', 'border-l-[3px]', 'pl-1'], // Borda lateral mais grossa
        extendedProps: {
          type: app.type || 'Agendamento',
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
      
      {/* Cabeçalho da Agenda - Refinado */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
               <CalendarIcon className="h-6 w-6 text-primary" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight">Agenda Integrada</h1>
           </div>
           <p className="text-muted-foreground mt-1 ml-1">Atendimentos individuais e atividades coletivas da unidade.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legenda Otimizada */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-dashed">
                <Tag className="h-4 w-4" /> Legenda
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Atendimentos</h4>
                  {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'Grupo').map(([name, color]) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full ring-2 ring-opacity-20 ring-current" style={{ backgroundColor: color, color: color }} />
                      {name}
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Coletivo</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-opacity-20 ring-current" style={{ backgroundColor: TYPE_COLORS['Grupo'], color: TYPE_COLORS['Grupo'] }} />
                    Grupos e Oficinas
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Botão Primário Forte */}
          <Button size="lg" className="h-12 px-6 font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98]" onClick={() => { setSelectedDate(undefined); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-5 w-5" /> Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10 transition-all">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Sincronizando agenda...</p>
            </div>
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