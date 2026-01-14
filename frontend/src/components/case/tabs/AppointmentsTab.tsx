import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format, isAfter, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Plus, Clock, ChevronRight, Loader2 } from 'lucide-react'
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
  'Atendimento': '#2563eb', 'Visita': '#16a34a', 'Retorno': '#f97316',
  'Reunião': '#9333ea', 'Grupo': '#7c3aed', 'Outro': '#64748b'
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
    return [...appointments].sort((a: any, b: any) => 
      new Date(b.data || b.start).getTime() - new Date(a.data || a.start).getTime()
    )
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
    }
  })

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-lg">Agenda do Caso</CardTitle>
            <CardDescription>Próximos compromissos e histórico de atendimentos</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsApptOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2"/> Novo
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="py-10 text-center text-muted-foreground">Carregando...</div>}
          
          {!isLoading && sortedList.length === 0 && (
            <div className="text-center py-10 text-muted-foreground bg-muted/5 border-2 border-dashed rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20"/>
                <p>Nenhum agendamento registrado.</p>
            </div>
          )}

          {sortedList.map((app: any) => {
            const safeDate = app.data || app.start
            const isFuture = safeDate && isAfter(new Date(safeDate), new Date())
            const typeColor = TYPE_COLORS[app.tipo] || TYPE_COLORS['Outro']

            return (
              <div key={app.id} className="flex group items-center justify-between p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className={clsx("p-2.5 rounded-lg bg-muted/40", isFuture && "bg-primary/10 text-primary")}>
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{app.titulo || app.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(safeDate), "dd 'de' MMM, HH:mm", { locale: ptBR })}</span>
                          <span>•</span>
                          <Badge variant="outline" className="h-5 px-1.5 font-normal text-[10px]" style={{ borderColor: typeColor, color: typeColor }}>
                            {app.tipo}
                          </Badge>
                      </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isValidBrazilianPhone(phone) && isFuture && (
                     <WhatsAppButton 
                       phone={phone!} 
                       name={caseName} 
                       template="agendamento" 
                       data={{ date: safeDate }} 
                       label="Confirmar" 
                       size="icon" 
                       variant="ghost"
                       className="h-8 w-8 text-muted-foreground hover:text-green-600"
                     />
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity"/>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isApptOpen} onOpenChange={setIsApptOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Vinculado ao caso de {caseName}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((d) => createAppointment(d))} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Título da Atividade</Label>
                <Input placeholder="Ex: Visita Domiciliar" {...control.register('titulo')} />
                {errors.titulo && <span className="text-xs text-destructive">{errors.titulo.message}</span>}
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label>Data</Label>
                  <Input type="date" {...control.register('data')} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>Hora</Label>
                  <Input type="time" {...control.register('time')} />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(TYPE_COLORS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label>Observações (Opcional)</Label>
                <Textarea placeholder="Detalhes..." {...control.register('observacoes')} className="resize-none h-20" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsApptOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Agendar
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}