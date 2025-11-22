// frontend/src/components/case/EvolutionsSection.tsx
import { useForm, type SubmitHandler } from 'react-hook-form' //
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query' //
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react' //
import { z } from 'zod' //

import { api } from '@/lib/api' //
import { getErrorMessage } from '@/utils/error' //
import { evolutionFormSchema } from '@/schemas/caseSchemas' //
import { formatDateSafe } from '@/utils/formatters' //
import { Button } from '@/components/ui/button' //
import { Textarea } from '@/components/ui/textarea' //
// Importa componentes de formulário do Shadcn
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type EvolutionFormData = z.infer<typeof evolutionFormSchema> //

interface Evolution { //
  id: string
  conteudo: string //
  createdAt: string //
  autor: { nome: string } //
}

export function EvolutionsSection({ caseId }: { caseId: string }) { //
  const queryClient = useQueryClient() //

  // --- CORREÇÃO (ReferenceError) ---
  // Precisamos da variável 'form' inteira para passar para o componente <Form>
  const form = useForm<EvolutionFormData>({ //
    resolver: zodResolver(evolutionFormSchema), //
    defaultValues: { conteudo: '' }, //
  })
  // --- FIM DA CORREÇÃO ---

  const { data: evolutions, isLoading: isLoadingEvolutions } = useQuery< //
    Evolution[]
  >({
    queryKey: ['evolutions', caseId], //
    queryFn: async () => { //
      const response = await api.get(`/cases/${caseId}/evolutions`) //
      return response.data //
    },
    enabled: !!caseId,
  })

  const { mutate: addEvolution, isPending } = useMutation({ //
    mutationFn: async (data: EvolutionFormData) => { //
      const response = await api.post(`/cases/${caseId}/evolutions`, data) //
      return response.data
    },
    onSuccess: () => { //
      toast.success('Evolução registada com sucesso.') //
      queryClient.invalidateQueries({ queryKey: ['evolutions', caseId] }) //
      form.reset() // Usa form.reset()
    },
    onError: (error) => { //
      toast.error(getErrorMessage(error, 'Falha ao registar evolução.')) //
    },
  })

  const onSubmit: SubmitHandler<EvolutionFormData> = (data) => { //
    addEvolution(data)
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-6"> {/* */}
      <h3 className="text-base font-semibold text-foreground"> {/* */}
        Histórico de Evoluções
      </h3>

      {/* Usando os componentes Form do Shadcn/ui */}
      <Form {...form}> {/* Passa o objeto 'form' completo */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FormField
            control={form.control} // Passa o 'control' do form
            name="conteudo" //
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="conteudo">Adicionar Nova Evolução</FormLabel>
                {/* Correção (Children.only): <FormControl> e <Textarea> na mesma linha */}
                <FormControl><Textarea
                  id="conteudo" //
                  rows={4} //
                  placeholder="Descreva aqui o atendimento, visita ou encaminhamento..." //
                  disabled={isPending} //
                  {...field} //
                /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end mt-2"> {/* */}
            <Button type="submit" disabled={isPending}> {/* */}
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {/* */}
              Registar Evolução {/* */}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-6 space-y-4"> {/* */}
        {isLoadingEvolutions && <p className="text-sm text-muted-foreground">A carregar histórico...</p>} {/* */}
        {evolutions?.map((evo) => ( //
          <div key={evo.id} className="bg-card p-4 rounded-md border"> {/* */}
            <p className="text-sm text-foreground whitespace-pre-wrap"> {/* */}
              {evo.conteudo} {/* */}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-right"> {/* */}
              Registado por {evo.autor.nome} em {formatDateSafe(evo.createdAt)} {/* */}
            </p>
          </div>
        ))}
        {!isLoadingEvolutions && evolutions?.length === 0 && ( //
          <p className="text-sm text-muted-foreground text-center py-4"> {/* */}
            Nenhum histórico registado.
          </p>
        )}
      </div>
    </div>
  )
}