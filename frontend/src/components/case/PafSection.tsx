// frontend/src/components/case/PafSection.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2, Edit, History, PlusCircle } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { pafFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DetailField } from './DetailField'
import { PafHistoryModal } from './PafHistoryModal'
import { usePaf } from '@/hooks/api/useCaseQueries'
import type { CaseDetailData, PafData } from '@/types/case'

// Tipo inferido do Zod
type PafFormData = z.infer<typeof pafFormSchema>

// Helper: formata "YYYY-MM-DD" para inputs de data
const formatDateForInput = (date: Date | string | undefined) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

/* -------------------------------------------------------------------------- */
/*                                FORMULÁRIO PAF                               */
/* -------------------------------------------------------------------------- */

function PafForm({
  caseId,
  existingPaf,
  onClose,
}: {
  caseId: string
  existingPaf: PafData | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const form = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      diagnostico: existingPaf?.diagnostico ?? '',
      objetivos: existingPaf?.objetivos ?? '',
      estrategias: existingPaf?.estrategias ?? '',
      deadline: formatDateForInput(existingPaf?.deadline),
    },
  })

  const { mutate: savePaf, isPending } = useMutation({
    mutationFn: async (data: PafFormData) => {
      const payload = {
        ...data,
        deadline: new Date(data.deadline).toISOString(),
      }

      return existingPaf
        ? api.put(`/cases/${caseId}/paf`, payload)
        : api.post(`/cases/${caseId}/paf`, payload)
    },
    onSuccess: () => {
      toast.success(existingPaf ? 'PAF atualizado (nova versão gerada)!' : 'PAF criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
      queryClient.invalidateQueries({ queryKey: ['paf-history', caseId] })
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Falha ao salvar o PAF.')),
  })

  const onSubmit: SubmitHandler<PafFormData> = (data) => savePaf(data)

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2"
      >
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="diagnostico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diagnóstico Sociofamiliar</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Descreva a situação atual..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="objetivos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivos</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Quais os objetivos a alcançar?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estrategias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estratégias de Intervenção</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Ações planejadas..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Prazo para Reavaliação</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingPaf ? 'Salvar Nova Versão' : 'Criar PAF'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   EXIBIÇÃO                                  */
/* -------------------------------------------------------------------------- */

function DisplayPaf({ paf }: { paf: PafData }) {
  return (
    <div className="mt-4 space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 gap-6">
        <DetailField
          label="Diagnóstico"
          value={paf.diagnostico}
          className="bg-muted/20 p-3 rounded-md border border-border/50"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailField
            label="Objetivos"
            value={paf.objetivos}
            className="bg-muted/20 p-3 rounded-md border border-border/50"
          />

          <DetailField
            label="Estratégias"
            value={paf.estrategias}
            className="bg-muted/20 p-3 rounded-md border border-border/50"
          />
        </div>

        <DetailField
          label="Prazo Final para Reavaliação"
          value={formatDateSafe(paf.deadline)}
          labelClassName="text-amber-600 font-bold"
        />
      </div>

      <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>Última atualização em {formatDateSafe(paf.createdAt)}</span>

        <span>
          Autor da versão atual:{' '}
          <strong className="font-medium text-foreground">
            {paf.autor.nome}
          </strong>
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              COMPONENTE PRINCIPAL                           */
/* -------------------------------------------------------------------------- */

export function PafSection({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const { data: paf, isLoading, isError } = usePaf(caseData.id)

  const [isEditing, setIsEditing] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const canCreatePaf =
    !paf &&
    caseData.status === 'EM_ACOMPANHAMENTO_PAEFI' &&
    caseData.especialistaPAEFI?.id === user?.id

  const canEditPaf =
    paf &&
    (user?.id === paf.autor.id || user?.cargo === 'Gerente') &&
    caseData.status !== 'DESLIGADO'

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <span className="w-1 h-4 bg-purple-600 rounded-full" />
          Plano de Acompanhamento Familiar (PAF)
        </h3>

        <div className="flex flex-wrap gap-2">
          {paf && (
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
              <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Histórico
            </Button>
          )}

          {canEditPaf && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-3.5 w-3.5" />
              Editar PAF
            </Button>
          )}

          {canCreatePaf && !isEditing && (
            <Button variant="default" size="sm" onClick={() => setIsEditing(true)}>
              <PlusCircle className="mr-2 h-3.5 w-3.5" />
              Elaborar PAF
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando PAF...</span>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          Erro ao carregar os dados do PAF.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {isEditing ? (
            <PafForm
              caseId={caseData.id}
              existingPaf={paf || null}
              onClose={() => setIsEditing(false)}
            />
          ) : paf ? (
            <DisplayPaf paf={paf} />
          ) : (
            !canCreatePaf && (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                <p className="text-sm">
                  {caseData.status === 'EM_ACOMPANHAMENTO_PAEFI'
                    ? 'Nenhum PAF elaborado. Aguardando o especialista responsável.'
                    : 'O PAF só pode ser elaborado quando o caso está em Acompanhamento PAEFI.'}
                </p>
              </div>
            )
          )}
        </>
      )}

      <PafHistoryModal
        caseId={caseData.id}
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  )
}
