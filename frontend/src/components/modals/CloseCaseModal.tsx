// frontend/src/components/modals/CloseCaseModal.tsx
import { useForm, type SubmitHandler, Controller } from 'react-hook-form' //
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod' //
import { Loader2 } from 'lucide-react' //

import { api } from '@/lib/api' //
import { getErrorMessage } from '@/utils/error' //
import { closeCaseFormSchema } from '@/schemas/caseSchemas' //
import { MOTIVOS_DESLIGAMENTO } from '@/constants/caseConstants' //
import { Button } from '@/components/ui/button' //
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog' //
import { Textarea } from '@/components/ui/textarea' //
import { Label } from '@/components/ui/label' //
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select' //

type CloseCaseFormData = z.infer<typeof closeCaseFormSchema> //

interface CloseCaseModalProps {
  caseId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseCaseModal({ caseId, isOpen, onOpenChange }: CloseCaseModalProps) { //
  const queryClient = useQueryClient()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset, // Adicionado para limpar o formulário
  } = useForm<CloseCaseFormData>({
    resolver: zodResolver(closeCaseFormSchema), //
    defaultValues: {
      motivoDesligamento: '',
      parecerFinal: '',
    },
  })

  const { mutate: closeCase, isPending } = useMutation({
    mutationFn: async (data: CloseCaseFormData) => {
      return await api.patch(`/cases/${caseId}/close`, data) //
    },
    onSuccess: () => {
      toast.success('Caso desligado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] }) //
      queryClient.invalidateQueries({ queryKey: ['case', caseId] }) //
      onOpenChange(false) //
      reset() // Limpa o formulário
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao desligar o caso.')) //
    },
  })

  const onSubmit: SubmitHandler<CloseCaseFormData> = (data) => { //
    closeCase(data)
  }

  // Função para fechar o modal e limpar o formulário
  const handleClose = () => {
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desligar Caso</DialogTitle> {/* */}
          <DialogDescription>
            Para finalizar o caso, por favor, selecione o motivo e insira o
            parecer final.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivoDesligamento">Motivo do Desligamento</Label> {/* */}
            <Controller
              name="motivoDesligamento"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="motivoDesligamento">
                    <SelectValue placeholder="Selecione um motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_DESLIGAMENTO.map((motivo) => ( //
                      <SelectItem key={motivo} value={motivo}>
                        {motivo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.motivoDesligamento && (
              <p className="text-sm text-destructive">
                {errors.motivoDesligamento.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="parecerFinal">Parecer Final</Label> {/* */}
            <Textarea
              id="parecerFinal"
              rows={5}
              {...register('parecerFinal')}
              placeholder="Descreva o motivo e o parecer técnico para o desligamento..."
            />
            {errors.parecerFinal && (
              <p className="text-sm text-destructive">
                {errors.parecerFinal.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Desligamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}