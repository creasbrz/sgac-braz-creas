// frontend/src/components/modals/CloseCaseModal.tsx
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/axios'
import { getErrorMessage } from '@/utils/error'
import { closeCaseFormSchema } from '@/schemas/caseSchemas'
import { MOTIVOS_DESLIGAMENTO, DESTINOS_DESLIGAMENTO } from '@/constants/caseConstants' // [ATUALIZADO]
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CloseCaseFormData = z.infer<typeof closeCaseFormSchema>

interface CloseCaseModalProps {
  caseId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseCaseModal({ caseId, isOpen, onOpenChange }: CloseCaseModalProps) {
  const queryClient = useQueryClient()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CloseCaseFormData>({
    resolver: zodResolver(closeCaseFormSchema),
    defaultValues: {
      motivoDesligamento: '',
      destinoDesligamento: '', // [NOVO]
      parecerFinal: '',
    },
  })

  const { mutate: closeCase, isPending } = useMutation({
    mutationFn: async (data: CloseCaseFormData) => {
      return await api.patch(`/cases/${caseId}/close`, data)
    },
    onSuccess: () => {
      toast.success('Caso desligado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      onOpenChange(false)
      reset()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao desligar o caso.'))
    },
  })

  const onSubmit: SubmitHandler<CloseCaseFormData> = (data) => closeCase(data)

  const handleClose = () => {
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Desligamento Qualificado</DialogTitle>
          <DialogDescription>
            Registre o encerramento do acompanhamento e o destino da família.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="motivoDesligamento">Motivo</Label>
            <Controller
              name="motivoDesligamento"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="motivoDesligamento">
                    <SelectValue placeholder="Selecione um motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_DESLIGAMENTO.map((motivo) => (
                      <SelectItem key={motivo} value={motivo}>{motivo.length > 60 ? motivo.slice(0,60)+'...' : motivo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.motivoDesligamento && <p className="text-sm text-destructive">{errors.motivoDesligamento.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinoDesligamento">Destino / Encaminhamento Pós-Alta</Label>
            <Controller
              name="destinoDesligamento"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Para onde foi encaminhado?" /></SelectTrigger>
                  <SelectContent>
                    {DESTINOS_DESLIGAMENTO.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.destinoDesligamento && <p className="text-sm text-destructive">{errors.destinoDesligamento.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parecerFinal">Parecer Técnico Final</Label>
            <Textarea
              id="parecerFinal"
              rows={5}
              {...register('parecerFinal')}
              placeholder="Resumo das intervenções e justificativa do desligamento..."
            />
            {errors.parecerFinal && <p className="text-sm text-destructive">{errors.parecerFinal.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Desligamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}