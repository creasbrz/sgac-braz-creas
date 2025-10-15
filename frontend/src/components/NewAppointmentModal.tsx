// frontend/src/components/NewAppointmentModal.tsx
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
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

interface CaseOption {
  id: string
  nomeCompleto: string
}

const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  data: z.string().min(1, 'A data é obrigatória.'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida.'),
  casoId: z.string().uuid('Selecione um caso.'),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface NewAppointmentModalProps {
  onOpenChange: (isOpen: boolean) => void
  defaultCaseId?: string | null
}

export function NewAppointmentModal({ onOpenChange, defaultCaseId }: NewAppointmentModalProps) {
  const queryClient = useQueryClient()
  const { data: cases } = useQuery<CaseOption[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await api.get('/cases')
      return response.data?.items ?? [] // Garante que `items` existe
    },
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AppointmentFormData>({
    // O zodResolver não é mais necessário aqui se não estiver a usá-lo diretamente
    defaultValues: {
      titulo: '',
      data: '',
      time: '',
      casoId: defaultCaseId ?? '',
    }
  })

  useEffect(() => {
    if (defaultCaseId) {
      setValue('casoId', defaultCaseId)
    }
  }, [defaultCaseId, setValue])

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const [hours, minutes] = data.time.split(':').map(Number)
      const appointmentDate = new Date(data.data)
      appointmentDate.setHours(hours, minutes)

      const dataToSend = {
        titulo: data.titulo,
        casoId: data.casoId,
        data: appointmentDate.toISOString(),
      }
      return await api.post('/appointments', dataToSend)
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
          {errors.titulo && <p className="text-sm text-destructive">{errors.titulo.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Controller
              name="data"
              control={control}
              render={({ field }) => <Input type="date" id="data" {...field} />}
            />
            {errors.data && <p className="text-sm text-destructive">{errors.data.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Hora</Label>
            <Controller
              name="time"
              control={control}
              render={({ field }) => <Input type="time" id="time" {...field} />}
            />
            {errors.time && <p className="text-sm text-destructive">{errors.time.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="casoId">Vincular ao Caso</Label>
          <Controller
            name="casoId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={!!defaultCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um caso..." />
                </SelectTrigger>
                <SelectContent>
                  {cases?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nomeCompleto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.casoId && <p className="text-sm text-destructive">{errors.casoId.message}</p>}
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