// frontend/src/pages/Agenda.tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/constants/routes'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/utils/error'

interface Appointment {
  id: string
  titulo: string
  data: string
  caso: {
    id: string
    nomeCompleto: string
  }
}

interface CaseOption {
  id: string
  nomeCompleto: string
}

const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  data: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida.'),
  casoId: z.string().uuid('Selecione um caso.'),
  observacoes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

function NewAppointmentModal({
  onOpenChange,
  defaultCaseId,
}: {
  onOpenChange: (isOpen: boolean) => void
  defaultCaseId?: string | null
}) {
  const queryClient = useQueryClient()

  const { data: casesResponse } = useQuery<{ items: CaseOption[] }>({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await api.get('/cases')
      return response.data
    },
  })

  const cases = casesResponse?.items

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      titulo: '',
      data: '',
      time: '',
      casoId: defaultCaseId ?? '',
    },
  })

  useEffect(() => {
    if (defaultCaseId) {
      setValue('casoId', defaultCaseId)
    }
  }, [defaultCaseId, setValue])

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      return await api.post('/appointments', data)
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

  const onSubmit: SubmitHandler<AppointmentFormData> = (data) => {
    createAppointment(data)
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo Agendamento</DialogTitle>
        <DialogDescription>
          Preencha os dados para criar um novo evento na sua agenda.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="titulo">Título do Agendamento</Label>
          <Controller
            name="titulo"
            control={control}
            render={({ field }) => <Input id="titulo" {...field} />}
          />
          {errors.titulo && (
            <p className="text-sm text-destructive">{errors.titulo.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Controller
              name="data"
              control={control}
              render={({ field }) => <Input type="date" id="data" {...field} />}
            />
            {errors.data && (
              <p className="text-sm text-destructive">{errors.data.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Hora</Label>
            <Controller
              name="time"
              control={control}
              render={({ field }) => <Input type="time" id="time" {...field} />}
            />
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Vincular ao Caso</Label>
          <Controller
            name="casoId"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!!defaultCaseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um caso..." />
                </SelectTrigger>
                <SelectContent>
                  {cases?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nomeCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.casoId && (
            <p className="text-sm text-destructive">{errors.casoId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Observações (Opcional)</Label>
          <Controller
            name="observacoes"
            control={control}
            render={({ field }) => (
              <Textarea placeholder="Detalhes adicionais..." {...field} />
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

// =====================================================
// ===================  PÁGINA PRINCIPAL  ===============
// =====================================================

export function Agenda() {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [searchParams] = useSearchParams()
  const defaultCaseId = searchParams.get('caseId')

  useEffect(() => {
    if (defaultCaseId) setIsModalOpen(true)
  }, [defaultCaseId])

  const monthQuery = format(currentMonth, 'yyyy-MM')

  const { data: appointments, isLoading: isLoadingAppointments } =
    useQuery<Appointment[]>({
      queryKey: ['appointments', monthQuery],
      queryFn: async () => {
        const response = await api.get('/appointments', {
          params: { month: monthQuery },
        })
        return response.data
      },
    })

  const appointmentsOnSelectedDay =
    selectedDay && appointments
      ? appointments.filter(
          (app) =>
            format(new Date(app.data), 'yyyy-MM-dd') ===
            format(selectedDay, 'yyyy-MM-dd'),
        )
      : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agenda de Atendimentos</h2>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>Novo Agendamento</Button>
          </DialogTrigger>

          <NewAppointmentModal
            onOpenChange={setIsModalOpen}
            defaultCaseId={defaultCaseId}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-0 flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              modifiers={{
                scheduled: appointments?.map((app) => new Date(app.data)) ?? [],
              }}
              modifiersClassNames={{
                scheduled: 'font-bold text-primary',
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Agendamentos para{' '}
              {selectedDay
                ? format(selectedDay, 'PPP', { locale: ptBR })
                : 'Nenhum dia selecionado'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {isLoadingAppointments && (
              <p className="text-sm text-muted-foreground">
                Carregando agendamentos...
              </p>
            )}

            {!isLoadingAppointments &&
            appointmentsOnSelectedDay.length > 0 ? (
              <ul className="space-y-4">
                {appointmentsOnSelectedDay.map((app) => (
                  <li
                    key={app.id}
                    className="border-l-4 border-primary pl-4"
                  >
                    <p className="font-semibold">{app.titulo}</p>

                    <Link
                      to={ROUTES.CASE_DETAIL(app.caso.id)}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      Caso: {app.caso.nomeCompleto}
                    </Link>

                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(app.data), 'HH:mm')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingAppointments && (
                <p className="text-muted-foreground">
                  Nenhum agendamento para este dia.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
