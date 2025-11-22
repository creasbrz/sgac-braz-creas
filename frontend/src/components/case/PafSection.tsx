// frontend/src/components/case/PafSection.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form' // Removido Controller
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query' // Removido useQuery
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2, Edit } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { pafFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DetailField } from './DetailField'
import type { CaseDetailData, PafData } from '@/types/case'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { usePaf } from '@/hooks/api/useCaseQueries'

// ... (Resto do código permanece igual)

type PafFormData = z.infer<typeof pafFormSchema>

// --- Subcomponente DisplayPaf ---
function DisplayPaf({ paf }: { paf: PafData }) {
  return (
    <div className="mt-4 space-y-4">
      <DetailField label="Diagnóstico" value={paf.diagnostico} />
      <DetailField label="Objetivos" value={paf.objetivos} />
      <DetailField label="Estratégias" value={paf.estrategias} />
      <DetailField label="Prazo Final" value={formatDateSafe(paf.deadline)} />
      <p className="text-xs text-muted-foreground pt-2 border-t">
        Criado por {paf.autor.nome} em {formatDateSafe(paf.createdAt)}
      </p>
    </div>
  )
}

// --- Função formatDateForInput ---
const formatDateForInput = (date: Date | string | undefined) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  } catch (error) {
    return ''
  }
}

// --- Subcomponente PafForm ---
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
        deadline: new Date(data.deadline),
      }
      if (existingPaf) {
        return api.put(`/cases/${caseId}/paf`, payload)
      } else {
        return api.post(`/cases/${caseId}/paf`, payload)
      }
    },
    onSuccess: () => {
      toast.success('PAF salvo com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao salvar o PAF.'))
    },
  })

  const onSubmit: SubmitHandler<PafFormData> = (data) => {
    savePaf(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <FormField
          control={form.control}
          name="diagnostico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnóstico</FormLabel>
              <FormControl><Textarea rows={3} {...field} /></FormControl>
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
              <FormControl><Textarea rows={3} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estrategias"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estratégias</FormLabel>
              <FormControl><Textarea rows={3} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo Final (Deadline)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
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
            Salvar PAF
          </Button>
        </div>
      </form>
    </Form>
  )
}

// --- Componente Principal ---
export function PafSection({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const {
    data: paf,
    isLoading,
    isError,
  } = usePaf(caseData.id)

  const [isEditing, setIsEditing] = useState(false)

  const canCreatePaf =
    !paf &&
    caseData.status === 'EM_ACOMPANHAMENTO_PAEFI' &&
    caseData.especialistaPAEFI?.id === user?.id

  const canEditPaf =
    paf &&
    (user?.id === paf.autor.id || user?.cargo === 'Gerente') &&
    caseData.status !== 'DESLIGADO'

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Plano de Acompanhamento Familiar (PAF)
        </h3>
        {canEditPaf && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar PAF
          </Button>
        )}
        {canCreatePaf && !isEditing && (
          <Button variant="default" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Elaborar PAF
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground mt-4">A carregar PAF...</p>}
      
      {isError && (
        <p className="text-sm text-destructive mt-4">
          Erro ao carregar o PAF.
        </p>
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
              <p className="text-sm text-muted-foreground mt-4 text-center py-4">
                {caseData.status === 'EM_ACOMPANHAMENTO_PAEFI'
                  ? 'Nenhum PAF elaborado para este caso.'
                  : 'O PAF só pode ser elaborado quando o caso está em Acompanhamento PAEFI.'}
              </p>
            )
          )}
        </>
      )}
    </div>
  )
}