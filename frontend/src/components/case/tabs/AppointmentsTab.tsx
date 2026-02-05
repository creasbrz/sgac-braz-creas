// frontend/src/components/case/tabs/AppointmentsTab.tsx
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format, isAfter, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Plus, Clock, ChevronRight, Loader2, CalendarClock } from 'lucide-react'
import { clsx } from 'clsx'

// Forms
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// UI
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { isValidBrazilianPhone } from '@/utils/phone'

const TYPE_COLORS: Record<string, string> = {
  'Atendimento': 'hsl(var(--chart-1))', 
  'Visita': 'hsl(var(--status-success-fg))', 
  'Retorno': 'hsl(var(--status-warning-fg))',
  'Reunião': 'hsl(var(--status-ai-fg))', 
  'Grupo': 'hsl(330 80% 60%)', 
  'Outro': 'hsl(var(--muted-foreground))'
}

// Helpers
function combineDateAndTime(dateStr: string, timeStr: string) {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    const [h, m] = timeStr.split(':').map(Number)
    date.setHours(h, m, 0, 0)
    return date.toISOString()
  } catch { return new Date().toISOString() }
}

const appointmentFormSchema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  tipo: z.string(),
  observacoes: z.string().optional(),
})
type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface AppointmentsTabProps {
  caseId: string
  caseName: string
  phone?: string | null
}

export function AppointmentsTab({ caseId, caseName, phone }: AppointmentsTabProps) {
  const queryClient = useQueryClient()
  const [isApptOpen, setIsApptOpen] = useState(false)

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: { titulo: '', data: format(new Date(), 'yyyy-MM-dd'), time: '09:00', tipo: 'Atendimento' }
  })

  // Query
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", caseId],
    queryFn: async () => (await api.get(`/appointments`, { params: { caseId } })).data,
  })

  // Sort
  const sortedList = useMemo(() => {
    return [...appointments].sort((a: any, b: any) => {
      const dateA = new Date(a.data || a.start).getTime()
      const dateB = new Date(b.data || b.start).getTime()
      return dateB - dateA // Mais recente primeiro
    })
  }, [appointments])

  // Mutation
  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      await api.post("/appointments", { 
        ...data, 
        data: combineDateAndTime(data.data, data.time), 
        casoId: caseId 
      })
    },
    onSuccess: () => {
      toast.success("Agendado com sucesso!")
      setIsApptOpen(false)
      reset()
      queryClient.invalidateQueries({ queryKey: ["appointments", caseId] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", caseId] })
    },
    onError: () => toast.error("Erro ao criar agendamento.")
  })

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/40 bg-muted/5">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
               <CalendarClock className="h-5 w-5 text-primary"/> Agenda do Caso
            </CardTitle>
            <CardDescription>Próximos compromissos e histórico de atendimentos</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsApptOpen(true)} className="shadow-sm gap-2">
            <Plus className="h-4 w-4"/> Novo Agendamento
          </Button>
        </CardHeader>
        
        {/* [CORREÇÃO TAILWIND] min-h-[300px] -> min-h-75 */}
        <CardContent className="space-y-3 p-6 min-h-75">
          {isLoading && (
             <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50"/>
                <p className="text-xs uppercase tracking-widest">Carregando...</p>
             </div>
          )}
          
          {!isLoading && sortedList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/10 border-2 border-dashed border-border/60 rounded-xl gap-2">
                <div className="p-3 bg-background rounded-full border shadow-sm">
                   <Calendar className="h-6 w-6 opacity-30"/>
                </div>
                <p className="text-sm font-medium">Nenhum agendamento registrado.</p>
            </div>
          )}

          {sortedList.map((app: any) => {
            const safeDateStr = app.data || app.start
            const dateObj = isValid(new Date(safeDateStr)) ? new Date(safeDateStr) : new Date()
            const isFuture = isAfter(dateObj, new Date())
            const typeColor = TYPE_COLORS[app.tipo] || TYPE_COLORS['Outro']

            return (
              <div 
                key={app.id} 
                className="flex group items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center gap-4">
                    {/* Date Box */}
                    <div className={clsx(
                      "flex flex-col items-center justify-center w-12 h-12 rounded-lg border shrink-0",
                      isFuture 
                        ? "bg-primary/5 border-primary/20 text-primary" 
                        : "bg-muted/30 border-border text-muted-foreground"
                    )}>
                      <span className="text-[10px] uppercase font-bold leading-none">{format(dateObj, "MMM", { locale: ptBR })}</span>
                      <span className="text-lg font-bold leading-none mt-0.5">{format(dateObj, "dd")}</span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{app.titulo || app.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                             <Clock className="h-3 w-3"/> {format(dateObj, "HH:mm")}
                          </span>
                          <span className="text-border">|</span>
                          <Badge variant="outline" className="h-4.5 px-1.5 font-medium text-[10px] uppercase tracking-wide border-0 bg-opacity-10" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                            {app.tipo}
                          </Badge>
                      </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {isValidBrazilianPhone(phone) && isFuture && (
                      <WhatsAppButton 
                        phone={phone!} 
                        name={caseName} 
                        template="agendamento" 
                        data={{ date: safeDateStr }} 
                        label="Confirmar" 
                        size="icon" 
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      />
                  )}
                  <div className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer">
                     <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors"/>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isApptOpen} onOpenChange={setIsApptOpen}>
        {/* [CORREÇÃO TAILWIND] sm:max-w-[500px] -> sm:max-w-125 */}
        <DialogContent className="sm:max-w-125 gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b">
              <DialogTitle className="flex items-center gap-2">
                 <div className="p-1.5 bg-primary/10 rounded border border-primary/20"><Calendar className="h-4 w-4 text-primary"/></div>
                 Novo Agendamento
              </DialogTitle>
              <DialogDescription>Vinculado ao prontuário de <span className="font-medium text-foreground">{caseName}</span></DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit((d) => createAppointment(d))} className="px-6 py-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Título da Atividade</Label>
                <Input placeholder="Ex: Visita Domiciliar" {...control.register('titulo')} className="font-medium" />
                {errors.titulo && <span className="text-xs text-destructive font-medium">{errors.titulo.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Data</Label>
                  <Input type="date" {...control.register('data')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Hora</Label>
                  <Input type="time" {...control.register('time')} />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(TYPE_COLORS).map(t => (
                             <SelectItem key={t} value={t}>
                               <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }}/>
                                  {t}
                               </div>
                             </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Observações (Opcional)</Label>
                <Textarea placeholder="Detalhes..." {...control.register('observacoes')} className="resize-none h-24 bg-muted/10" />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsApptOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending} className="min-w-24 font-semibold">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Agendar"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  )
}