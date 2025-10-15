// frontend/src/components/case/ManagerActions.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useSpecialists } from '@/hooks/api/useCaseQueries'
import { getErrorMessage } from '@/utils/error'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { CaseDetailData } from '@/pages/CaseDetail'

export function ManagerActions({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedSpecialist, setSelectedSpecialist] = useState('')

  const { data: specialists, isLoading: isLoadingSpecialists } =
    useSpecialists()

  const { mutate: assignSpecialist, isPending } = useMutation({
    mutationFn: async (specialistId: string) => {
      return await api.patch(`/cases/${caseData.id}/assign`, { specialistId })
    },
    onSuccess: () => {
      toast.success('Especialista atribuído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao atribuir especialista.'))
    },
  })

  if (
    user?.cargo !== 'Gerente' ||
    caseData.status !== 'AGUARDANDO_DISTRIBUICAO_PAEFI'
  ) {
    return null
  }

  const handleAssign = () => {
    if (!selectedSpecialist) {
      toast.error('Por favor, selecione um especialista.')
      return
    }
    assignSpecialist(selectedSpecialist)
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">Ações do Gerente</h3>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:gap-4 space-y-4 sm:space-y-0">
        <div className="flex-1 space-y-2">
          <Label htmlFor="specialist">Atribuir a Especialista</Label>
          <Select
            onValueChange={setSelectedSpecialist}
            value={selectedSpecialist}
            disabled={isLoadingSpecialists || isPending}
          >
            <SelectTrigger id="specialist">
              <SelectValue
                placeholder={isLoadingSpecialists ? 'A carregar...' : 'Selecione...'}
              />
            </SelectTrigger>
            <SelectContent>
              {specialists?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAssign}
          disabled={isPending || !selectedSpecialist}
          className="w-full sm:w-auto"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Atribuir
        </Button>
      </div>
    </div>
  )
}

