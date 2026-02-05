// frontend/src/pages/Agenda.tsx
import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Loader2, Calendar as CalendarIcon, Plus,
  Users, Clock, Info, Check, ChevronsUpDown,
  CalendarDays, ExternalLink, User
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { combineDateAndTime } from '@/utils/date'
import { FullCalendarWidget, type CalendarEvent } from '@/components/agenda/FullCalendarWidget'
import { ROUTES } from '@/constants/app-routes'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose
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

// --- UTILS ---
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// --- TYPES ---
interface Case {
  id: string
  nomeCompleto: string
}

interface AppointmentAPI {
  id: string
  title: string
  start: string
  type: string
  description?: string
  resourceId?: string 
  urgencia?: 'BAIXA' | 'MEDIA' | 'ALTA'
  nomeCompleto?: string
}

// Cores Institucionais
// Adaptado para usar variáveis CSS nativas ou valores HSL diretos do Tailwind v4
const TYPE_COLORS: Record<string, string> = {
  'Atendimento': '#3b82f6', // blue-500
  'Visita': '#22c55e',      // green-500
  'Retorno': '#f59e0b',     // amber-500
  'Reunião': '#8b5cf6',     // violet-500
  'Grupo': '#ec4899',       // pink-500
  'Outro': '#64748b'        // slate-500
}

// --- SCHEMA ---
const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'Título muito curto'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Hora inválida'),
  tipo: z.string().min(1, 'Selecione um tipo'),
  casoId: z.string().optional(),
  observacoes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

// --- SUB-COMPONENT: CASE SELECTOR ---
function CaseCombobox({ value, onChange, disabled }: { value?: string, onChange: (val: string) => void, disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  
  const { data, isLoading } = useQuery({ 
    queryKey: ['cases', 'select-list'],
    queryFn: async () => {
      const response = await api.get('/cases', { params: { pageSize: 50, sort: 'nomeCompleto:asc' } })
      return response.data
    },
    staleTime: 1000 * 60 * 10
  })

  const cases = useMemo(() => {
    if (!data) return []
    // Tratamento robusto para diferentes formatos de resposta de paginação
    if (Array.isArray(data)) return data
    // @ts-ignore
    if (Array.isArray(data.items)) return data.items
    // @ts-ignore
    if (Array.isArray(data.data)) return data.data
    return []
  }, [data]) as Case[]

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
          {isLoading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</span>
          ) : selectedCase ? (
            selectedCase.nomeCompleto
          ) : (
            "Vincular a um prontuário (Opcional)"
          )}
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
                  onSelect={() => { 
                    onChange(c.id)
                    setOpen(false) 
                  }}
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

// --- COMPONENT: CREATE DIALOG ---
function AppointmentDialog({ open, onOpenChange, defaultCaseId, defaultDate }: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  defaultCaseId?: string | null,
  defaultDate?: string
}) {
  const queryClient = useQueryClient()
  
  const { control, handleSubmit, formState: { errors }, reset, setValue } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      titulo: '', 
      data: defaultDate || format(new Date(), 'yyyy-MM-dd'), 
      time: '09:00', 
      tipo: 'Atendimento',
      casoId: defaultCaseId || undefined, 
      observacoes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (defaultDate) setValue('data', defaultDate)
      if (defaultCaseId) setValue('casoId', defaultCaseId)
    }
  }, [open, defaultDate, defaultCaseId, setValue])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return await api.post('/appointments', {
        ...data,
        data: combineDateAndTime(data.data, data.time),
      })
    },
    onSuccess: () => {
      toast.success('Agendamento realizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden bg-background border-border shadow-lg">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground text-xl">
            <div className="p-2 bg-primary/10 rounded-md border border-primary/20 shadow-sm">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            Novo Agendamento
          </DialogTitle>
          <DialogDescription className="text-muted-foreground ml-1">
            Registre atendimentos, visitas ou atividades técnicas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutate(d))} className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="titulo" className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Título da Atividade</Label>
              <Controller
                name="titulo" control={control}
                render={({ field }) => <Input id="titulo" placeholder="Ex: Visita Domiciliar" {...field} className="font-medium bg-background h-10" />}
              />
              {errors.titulo && <p className="text-xs text-destructive font-medium">{errors.titulo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Tipo</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Data</Label>
              <Controller
                name="data" control={control}
                render={({ field }) => <Input type="date" {...field} className="bg-background h-10" />}
              />
              {errors.data && <p className="text-xs text-destructive font-medium">{errors.data.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Horário</Label>
              <Controller
                name="time" control={control}
                render={({ field }) => <Input type="time" {...field} className="bg-background h-10" />}
              />
              {errors.time && <p className="text-xs text-destructive font-medium">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Assistido (Opcional)</Label>
            <Controller
              name="casoId" control={control}
              render={({ field }) => (
                <CaseCombobox value={field.value} onChange={field.onChange} disabled={!!defaultCaseId} />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wider">Observações</Label>
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

// --- COMPONENT: DETAIL DIALOG ---
function EventDetailDialog({ event, onClose }: { event: CalendarEvent | null, onClose: () => void }) {
  if (!event) return null
  
  const { extendedProps } = event
  const isGroup = (extendedProps?.type || '').toLowerCase() === 'grupo'
  const linkTo = isGroup ? ROUTES.GROUPS : ROUTES.CASES + '/' + extendedProps?.resourceId
  
  // Cor de fallback
  const color = event.borderColor || TYPE_COLORS['Outro']

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-background border-border shadow-lg">
        <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
        
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider mb-2 border-transparent px-2" style={{ color: color, backgroundColor: `${color}15` }}>
                {extendedProps?.type || 'Evento'}
              </Badge>
              <DialogTitle className="text-xl font-bold leading-tight text-foreground">
                {event.title}
              </DialogTitle>
            </div>
            
            <div className="flex flex-col items-end text-right shrink-0">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-foreground border border-border/50">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {format(parseISO(event.start), "HH:mm")}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 capitalize font-medium">
                {format(parseISO(event.start), "EEEE, dd MMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          
          {isGroup ? (
            <div className="flex items-start gap-3 p-3 bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/40 rounded-lg">
              <div className="p-2 bg-background rounded-full border border-pink-100 shadow-sm text-pink-500 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide">Atividade Coletiva</p>
                <p className="text-sm font-medium text-foreground mt-0.5">Este evento envolve múltiplos participantes.</p>
                {extendedProps?.resourceId && (
                  <Link 
                    to={linkTo} 
                    className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 hover:underline mt-2 font-semibold transition-colors"
                  >
                    Gerenciar participantes <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ) : extendedProps?.nomeCompleto ? (
            <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/60 rounded-lg">
              <div className="p-2 bg-background rounded-full border border-border/50 shadow-sm text-primary shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Vinculado a</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{extendedProps.nomeCompleto}</p>
                {extendedProps.resourceId && (
                  <Link 
                    to={linkTo} 
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-semibold transition-colors"
                  >
                    Ver prontuário <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-3 py-3 bg-muted/20 rounded-md border border-dashed border-border/60">
              <Info className="h-3.5 w-3.5 shrink-0" /> Agendamento técnico interno (sem vínculo direto).
            </div>
          )}

          {extendedProps?.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider pl-1">Observações</h4>
              <div className="text-sm text-foreground/90 leading-relaxed bg-muted/20 p-3 rounded-md border-l-2 border-border/60">
                {extendedProps.description}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-muted/10 border-t border-border/40 flex sm:justify-between items-center">
          <Button variant="outline" size="sm" className="w-full sm:w-auto text-muted-foreground hover:text-foreground" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- MAIN PAGE ---
export function Agenda() {
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
  const [searchParams] = useSearchParams()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === 'true' || searchParams.get('caseId')) {
      setIsCreateOpen(true)
    }
  }, [searchParams])

  const { data: appointmentsData, isLoading } = useQuery<AppointmentAPI[]>({
    queryKey: ['appointments', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { 
        params: { 
          start: dateRange.start.toISOString(), 
          end: dateRange.end.toISOString() 
        } 
      })
      return data || []
    },
    staleTime: 60000 
  })

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    if (!appointmentsData) return []
    
    return appointmentsData.map((app) => {
      const typeKey = Object.keys(TYPE_COLORS).find(
        key => key.toLowerCase() === (app.type || 'Outro').toLowerCase()
      ) || 'Outro'
      
      const typeColor = TYPE_COLORS[typeKey]
      const isGroup = typeKey === 'Grupo'
      
      return {
        id: app.id,
        title: app.title,
        start: app.start,
        backgroundColor: typeColor,
        borderColor: typeColor,
        extendedProps: {
          type: app.type,
          description: app.description,
          resourceId: app.resourceId,
          nomeCompleto: app.nomeCompleto || (!isGroup && app.resourceId ? `Assistido #${app.resourceId.slice(0,6)}` : undefined),
          urgencia: app.urgencia
        }
      }
    })
  }, [appointmentsData])

  const handleDateClick = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    setIsCreateOpen(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 animate-in fade-in duration-500 p-6 md:p-8 max-w-480 mx-auto w-full">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                 <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              Agenda Digital
            </h1>
            <p className="text-muted-foreground text-sm ml-1.5">
              Gestão de atendimentos, visitas e atividades técnicas do CREAS.
            </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 bg-background hover:bg-accent border-border/60 shadow-sm ml-auto sm:ml-0">
                <Info className="h-4 w-4 text-muted-foreground" /> 
                <span className="hidden sm:inline">Legenda</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-4 border-border shadow-lg">
              <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">Categorias de Atividade</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {Object.entries(TYPE_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full ring-1 ring-inset ring-black/10 shadow-sm" style={{ backgroundColor: color }} />
                    <span className="font-medium text-foreground/90">{name}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            onClick={() => { setSelectedDate(undefined); setIsCreateOpen(true); }} 
            className="h-9 shadow-sm font-semibold px-4 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-background border border-border shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carregando Agenda...</span>
            </div>
          </div>
        )}
        
        <FullCalendarWidget
          events={calendarEvents}
          onDateClick={handleDateClick}
          onEventClick={(info) => setSelectedEvent({
            id: info.event.id,
            title: info.event.title,
            start: info.event.startStr,
            backgroundColor: info.event.backgroundColor,
            borderColor: info.event.borderColor,
            extendedProps: info.event.extendedProps
          })}
          datesSet={(arg) => setDateRange({ start: arg.start, end: arg.end })}
        />
      </div>

      <AppointmentDialog
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        defaultCaseId={searchParams.get('caseId')} 
        defaultDate={selectedDate} 
      />

      <EventDetailDialog 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
      />
    </div>
  )
}