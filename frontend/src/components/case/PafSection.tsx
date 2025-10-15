// frontend/src/components/case/PafSection.tsx
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { usePaf } from '@/hooks/api/useCaseQueries'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { pafFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DetailField } from './DetailField'
import type { PafData } from '@/types/case'

type PafFormData = Zod.infer<typeof pafFormSchema>

function DisplayPaf({ paf }: { paf: PafData }) {
  return (
    <div className="mt-4 space-y-4">
      <DetailField label="Diagnóstico" value={paf.diagnostico} />
      <DetailField label="Objetivos" value={paf.objetivos} />
      <DetailField label="Estratégias" value={paf.estrategias} />
      <DetailField label="Prazos" value={paf.prazos} />
      <p className="text-xs text-muted-foreground pt-4 border-t text-right">
        Criado por {paf.autor.nome} em {formatDateSafe(paf.createdAt)}
      </p>
    </div>
  )
}

function CreatePafForm({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
  })

  const { mutate: createPaf, isPending } = useMutation({
    mutationFn: async (data: PafFormData) => {
      return await api.post(`/cases/${caseId}/paf`, data)
    },
    onSuccess: () => {
      toast.success('PAF criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar o PAF.'))
    },
  })

  const onSubmit: SubmitHandler<PafFormData> = (data) => {
    createPaf(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="diagnostico">Diagnóstico</Label>
        <Textarea id="diagnostico" rows={3} {...register('diagnostico')} />
        {errors.diagnostico && (
          <p className="text-sm text-destructive">{errors.diagnostico.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="objetivos">Objetivos</Label>
        <Textarea id="objetivos" rows={3} {...register('objetivos')} />
        {errors.objetivos && (
          <p className="text-sm text-destructive">{errors.objetivos.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="estrategias">Estratégias</Label>
        <Textarea id="estrategias" rows={3} {...register('estrategias')} />
        {errors.estrategias && (
          <p className="text-sm text-destructive">{errors.estrategias.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="prazos">Prazos</Label>
        <Textarea id="prazos" rows={2} {...register('prazos')} />
        {errors.prazos && <p className="text-sm text-destructive">{errors.prazos.message}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'A salvar...' : 'Salvar PAF'}
        </Button>
      </div>
    </form>
  )
}

interface PafSectionProps {
  caseId: string
  caseStatus: string
  specialistId: string | null | undefined
  currentUserId: string | null
}

export function PafSection({
  caseId,
  caseStatus,
  specialistId,
  currentUserId,
}: PafSectionProps) {
  const { data: paf, isLoading } = usePaf(caseId)

  const canCreatePaf =
    !paf &&
    caseStatus === 'EM_ACOMPANHAMENTO_PAEFI' &&
    specialistId === currentUserId

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">
        Plano de Acompanhamento Familiar (PAF)
      </h3>
      {isLoading && <p className="text-sm text-muted-foreground mt-4">A carregar PAF...</p>}
      {!isLoading && paf && <DisplayPaf paf={paf} />}
      {!isLoading && !paf && caseStatus !== 'EM_ACOMPANHAMENTO_PAEFI' && (
        <p className="text-sm text-muted-foreground mt-4">
          O PAF estará disponível quando o caso for atribuído a um especialista.
        </p>
      )}
      {!isLoading && canCreatePaf && <CreatePafForm caseId={caseId} />}
    </div>
  )
}