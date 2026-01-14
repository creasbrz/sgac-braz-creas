import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Loader2, Calendar as CalendarIcon, Plus,
  ChevronRight, Users, Clock, FileText, Info, Check, ChevronsUpDown
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { combineDateAndTime } from '@/utils/date'
import { FullCalendarWidget } from '@/components/agenda/FullCalendarWidget'
import { ROUTES } from '@/constants/app-routes'

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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

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

// --- COMPONENTE AUXILIAR: COMBOBOX DE CASOS ---
function CaseCombobox({ value, onChange, disabled }: { value?: string, onChange: (val: string) => void, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const { data: casesResponse } = useQuery({ 
    queryKey: ['cases', 'all-select'],
    queryFn: async () => (await api.get('/cases', { params: { pageSize: 100 } })).data,
    staleTime: 1000 * 60 * 5
  })

  const cases = useMemo(() => {
    if (!casesResponse) return []
    return Array.isArray(casesResponse) ? casesResponse : (casesResponse.data || casesResponse.items || [])
  }, [casesResponse])

  const selectedCase = cases.find((c: any) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedCase ? selectedCase.nomeCompleto : "Selecione um prontuário..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome..." />
          <CommandList>
            <CommandEmpty>Nenhum caso encontrado.</CommandEmpty>
            <CommandGroup>
              {cases.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={c.nomeCompleto}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
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

// --- MODAL DE NOVO AGENDAMENTO ---
function NewAppointmentModal({ open, onOpenChange, defaultCaseId, defaultDate, defaultTime }: any) {
  const queryClient = useQueryClient()
  
  const { control, handleSubmit, formState: { errors }, reset, setValue } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      titulo: '', data: defaultDate || '', time: defaultTime || '09:00', tipo: 'Atendimento',
      casoId: defaultCaseId ?? '', observacoes: '',
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
      return await api.post('/appointments', {
        titulo: data.titulo, casoId: data.casoId, observacoes: data.observacoes || null,
        data: combineDateAndTime(data.data, data.time), tipo: data.tipo,
      })
    },
    onSuccess: () => {
      toast.success('Agendamento criado!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onOpenChange(false)
      reset()
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Erro ao agendar.'))
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>Preencha os dados para registrar um atendimento individual.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => createAppointment(d))} className="space-y-5 py-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">O que será feito?</Label>
              <Controller
                name="titulo" control={control}
                render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar, Escuta Especializada..." {...field} />}
              />
              {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Controller
                  name="tipo" control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(TYPE_COLORS).filter(t => t !== 'Grupo').map(type => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                              {type}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vincular Caso</Label>
                <Controller
                  name="casoId" control={control}
                  render={({ field }) => (
                    <CaseCombobox value={field.value} onChange={field.onChange} disabled={!!defaultCaseId} />
                  )}
                />
                {errors.casoId && <p className="text-xs text-destructive">{errors.casoId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Data</Label>
                <Controller
                  name="data" control={control}
                  render={({ field }) => <Input type="date" {...field} />}
                />
                {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Controller
                  name="time" control={control}
                  render={({ field }) => <Input type="time" {...field} />}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Controller
                name="observacoes" control={control}
                render={({ field }) => <Textarea placeholder="Detalhes opcionais..." className="resize-none h-20" {...field} />}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
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
  const color = event.borderColor

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between pr-6">
             <Badge variant="outline" className="font-bold border-2 px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ borderColor: color, color: color }}>
                {isGroup ? 'ATIVIDADE COLETIVA' : type}
             </Badge>
             {event.start && (
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded">
                   <Clock className="h-3 w-3" /> {format(event.start, "HH:mm")}
                </span>
             )}
          </div>
          <DialogTitle className="text-xl pt-2 leading-tight">{event.title}</DialogTitle>
          <DialogDescription>{event.start && format(event.start, "EEEE, dd 'de' MMMM", { locale: ptBR })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {description && (
            <div className="bg-muted/30 p-3 rounded-md border text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
               {description}
            </div>
          )}

          <div className="space-y-3">
             <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Ações Disponíveis</h4>
             
             {resourceId ? (
                <Link to={linkTo} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all group">
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                         {isGroup ? <Users className="h-4 w-4"/> : <FileText className="h-4 w-4"/>}
                      </div>
                      <div>
                         <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {isGroup ? "Gerenciar Grupo" : "Abrir Prontuário"}
                         </p>
                         <p className="text-xs text-muted-foreground">Ver detalhes completos</p>
                      </div>
                   </div>
                   <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
             ) : (
                <div className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded border border-dashed text-center">
                   Este evento não possui vínculo direto.
                </div>
             )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- PÁGINA PRINCIPAL ---
export function Agenda() {
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
  
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => (await api.get('/appointments', { params: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() } })).data,
    placeholderData: (prev) => prev,
    staleTime: 60000 
  })

  const appointments = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || appointmentsData?.items || [])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [searchParams] = useSearchParams()
  
  useEffect(() => { if (searchParams.get('caseId')) setIsCreateOpen(true) }, [searchParams])

  const calendarEvents = useMemo(() => {
    return appointments.map((app: any) => {
      let color = TYPE_COLORS['Outro']
      if (app.type === 'GRUPO') color = TYPE_COLORS['Grupo']
      else {
        const found = Object.keys(TYPE_COLORS).find(t => app.title?.toLowerCase().includes(t.toLowerCase()))
        if (found) color = TYPE_COLORS[found]
        else if (TYPE_COLORS[app.type]) color = TYPE_COLORS[app.type]
      }
      return {
        id: app.id, title: app.title, start: app.start || app.data,
        backgroundColor: `${color}1A`, borderColor: color, textColor: color, // 1A = ~10% opacity
        extendedProps: { type: app.type || 'Agendamento', description: app.description, resourceId: app.resourceId }
      }
    })
  }, [appointments])

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
           <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary opacity-80" /> Agenda Integrada
           </h1>
           <p className="text-muted-foreground text-sm">Gestão completa de atendimentos e atividades.</p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" /> Legenda
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b pb-1">Categorias</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-2 text-[11px]">
                      <div className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button size="lg" className="shadow-sm font-semibold" onClick={() => { setSelectedDate(undefined); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-5 w-5" /> Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative rounded-xl border bg-card shadow-sm overflow-hidden ring-1 ring-border/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <FullCalendarWidget
          events={calendarEvents}
          onDateClick={(d) => { setSelectedDate(format(d, 'yyyy-MM-dd')); setIsCreateOpen(true); }}
          onEventClick={(info) => setSelectedEvent(info.event)}
          datesSet={(arg) => setDateRange({ start: arg.start, end: arg.end })}
        />
      </div>

      <NewAppointmentModal
        open={isCreateOpen} onOpenChange={setIsCreateOpen}
        defaultCaseId={searchParams.get('caseId')} defaultDate={selectedDate} defaultTime="09:00"
      />

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}