// frontend/src/components/NewAppointmentModal.tsx
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
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

// Schema do formulário
const appointmentFormSchema = z.object({
  titulo: z.string().min(3, 'O título é muito curto.'),
  data: z.string().min(1, 'A data é obrigatória.'),
  time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida.'),
  casoId: z.string().uuid('Selecione um caso válido.'),
  observacoes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentFormSchema>

interface NewAppointmentModalProps {
  onOpenChange: (isOpen: boolean) => void
  defaultCaseId?: string | null
}

export function NewAppointmentModal({
  onOpenChange,
  defaultCaseId,
}: NewAppointmentModalProps) {
  const queryClient = useQueryClient()

  // Busca todos os casos (rota ajustada para trazer tudo)
  const { data: casesResponse, isLoading: isLoadingCases } = useQuery<{
    items: CaseOption[]
  }>({
    queryKey: ['cases', 'all'],
    queryFn: async () => {
      const response = await api.get('/cases', {
        params: {
          page: 1,
          pageSize: 9999,
        },
      })
      return response.data
    },
    staleTime: 60_000,
  })

  const cases = casesResponse?.items ?? []

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
      observacoes: '',
    },
  })

  // Pré-seleciona automaticamente casoId quando passado
  useEffect(() => {
    if (defaultCaseId) {
      setValue('casoId', defaultCaseId)
    }
  }, [defaultCaseId, setValue])

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const [hours, minutes] = data.time.split(':').map(Number)
      const appointmentDate = new Date(data.data + 'T00:00:00')
      appointmentDate.setHours(hours, minutes, 0, 0)

      const payload = {
        titulo: data.titulo,
        casoId: data.casoId,
        observacoes: data.observacoes,
        data: appointmentDate.toISOString(),
      }

      return await api.post('/appointments', payload)
    },
    onSuccess: () => {
      toast.success('Agendamento criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['myAgendaStats'] })
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar agendamento.'))
    },
  })

  const onSubmit: SubmitHandler<AppointmentFormData> = (data) => {
    createAppointment(data)
  }

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Novo Agendamento</DialogTitle>
        <DialogDescription>
          Preencha os dados para criar um novo evento na sua agenda.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="titulo">Título do Agendamento</Label>
          <Controller
            name="titulo"
            control={control}
            render={({ field }) => <Input id="titulo" {...field} />}
          />
          {errors.titulo && (
            <p className="text-sm text-destructive">
              {errors.titulo.message}
            </p>
          )}
        </div>

        {/* Data e Hora */}
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

        {/* Seleção do caso */}
        <div className="space-y-2">
          <Label htmlFor="casoId">Vincular ao Caso</Label>

          <Controller
            name="casoId"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingCases || !!defaultCaseId}
              >
                <SelectTrigger id="casoId">
                  <SelectValue
                    placeholder={
                      isLoadingCases ? 'Carregando casos...' : 'Selecione um caso...'
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {cases.map((c) => (
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

        {/* Observações */}
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações (Opcional)</Label>
          <Controller
            name="observacoes"
            control={control}
            render={({ field }) => (
              <Textarea
                id="observacoes"
                placeholder="Detalhes adicionais..."
                className="min-h-[80px]"
                {...field}
              />
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Agendar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
