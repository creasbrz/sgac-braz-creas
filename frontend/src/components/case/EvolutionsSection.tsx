// frontend/src/components/case/EvolutionsSection.tsx
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { evolutionFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type EvolutionFormData = Zod.infer<typeof evolutionFormSchema>

interface Evolution {
  id: string
  conteudo: string
  createdAt: string
  autor: { nome: string }
}

export function EvolutionsSection({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EvolutionFormData>({
    resolver: zodResolver(evolutionFormSchema),
  })

  const { data: evolutions, isLoading: isLoadingEvolutions } = useQuery<
    Evolution[]
  >({
    queryKey: ['evolutions', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/evolutions`)
      return response.data
    },
  })

  const { mutate: createEvolution, isPending } = useMutation({
    mutationFn: async (data: EvolutionFormData) => {
      return await api.post(`/cases/${caseId}/evolutions`, data)
    },
    onSuccess: () => {
      toast.success('Evolução registada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['evolutions', caseId] })
      reset()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao registar evolução.'))
    },
  })

  const onSubmit: SubmitHandler<EvolutionFormData> = (data) => {
    createEvolution(data)
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">
        Histórico de Evoluções
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
        <Textarea
          id="conteudo"
          rows={4}
          {...register('conteudo')}
          placeholder="Descreva aqui o atendimento, visita ou encaminhamento..."
          disabled={isPending}
        />
        {errors.conteudo && (
          <p className="text-sm text-destructive mt-1">
            {errors.conteudo.message}
          </p>
        )}
        <div className="flex justify-end mt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registar Evolução
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {isLoadingEvolutions && (
          <p className="text-sm text-muted-foreground">A carregar histórico...</p>
        )}
        {evolutions?.map((evo) => (
          <div key={evo.id} className="bg-card p-4 rounded-md border">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {evo.conteudo}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Registado por {evo.autor.nome} em {formatDateSafe(evo.createdAt)}
            </p>
          </div>
        ))}
        {!isLoadingEvolutions && evolutions?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma evolução registada.
          </p>
        )}
      </div>
    </div>
  )
}

