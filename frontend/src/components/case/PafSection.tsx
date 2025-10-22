// frontend/src/components/case/PafSection.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { usePaf } from '@/hooks/api/useCaseQueries'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { pafFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DetailField } from './DetailField'
import type { CaseDetailData, PafData } from '@/types/case'

type PafFormData = z.infer<typeof pafFormSchema>

// --- Subcomponentes ---

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

function PafForm({
  caseId,
  existingPaf,
  onClose,
}: {
  caseId: string
  existingPaf?: PafData | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      diagnostico: existingPaf?.diagnostico ?? '',
      objetivos: existingPaf?.objetivos ?? '',
      estrategias: existingPaf?.estrategias ?? '',
      prazos: existingPaf?.prazos ?? '',
    },
  })

  const { mutate: createPaf, isPending: isCreating } = useMutation({
    mutationFn: async (data: PafFormData) => {
      return await api.post(`/cases/${caseId}/paf`, data)
    },
    onSuccess: () => {
      toast.success('PAF criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao criar o PAF.'))
    },
  })

  const { mutate: updatePaf, isPending: isUpdating } = useMutation({
    mutationFn: async (data: PafFormData) => {
      return await api.put(`/cases/${caseId}/paf`, data)
    },
    onSuccess: () => {
      toast.success('PAF atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao atualizar o PAF.'))
    },
  })

  const isPending = isCreating || isUpdating

  const onSubmit: SubmitHandler<PafFormData> = (data) => {
    if (existingPaf) {
      updatePaf(data)
    } else {
      createPaf(data)
    }
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingPaf ? 'Salvar Alterações' : 'Salvar PAF'}
        </Button>
      </div>
    </form>
  )
}

// --- Componente Principal ---

interface PafSectionProps {
  caseData: CaseDetailData
}

export function PafSection({ caseData }: PafSectionProps) {
  const { user } = useAuth()
  const { data: paf, isLoading } = usePaf(caseData.id)
  const [isEditing, setIsEditing] = useState(false)

  const canCreatePaf =
    !paf &&
    caseData.status === 'EM_ACOMPANHAMENTO_PAEFI' &&
    caseData.especialistaPAEFI?.id === user?.id
  
  // Correção: Compara o ID do utilizador com o ID do autor do PAF
  const canEditPaf =
    paf && (user?.id === paf.autor.id || user?.cargo === 'Gerente')

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Plano de Acompanhamento Familiar (PAF)
        </h3>
        {canEditPaf && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Editar PAF
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground mt-4">A carregar PAF...</p>}
      
      {!isLoading && paf && !isEditing && <DisplayPaf paf={paf} />}
      
      {!isLoading && (paf && isEditing) && (
        <PafForm caseId={caseData.id} existingPaf={paf} onClose={() => setIsEditing(false)} />
      )}

      {!isLoading && !paf && caseData.status !== 'EM_ACOMPANHAMENTO_PAEFI' && (
        <p className="text-sm text-muted-foreground mt-4">
          O PAF estará disponível quando o caso for atribuído a um especialista.
        </p>
      )}

      {!isLoading && canCreatePaf && !isEditing && (
        <PafForm caseId={caseData.id} onClose={() => {}} />
      )}
    </div>
  )
}