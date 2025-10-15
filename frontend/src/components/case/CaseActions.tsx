// frontend/src/components/case/CaseActions.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/error'
import { caseTransitions, type CaseStatusIdentifier } from '@/constants/caseTransitions'
import type { CaseDetailData } from '@/pages/CaseDetail'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function CaseActions({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: async (newStatus: string) => {
      return await api.patch(`/cases/${caseData.id}/status`, {
        status: newStatus,
      })
    },
    onSuccess: () => {
      toast.success('Status do caso atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao atualizar o status.'))
    },
    onSettled: () => {
      setPendingStatus(null)
    },
  })

  const handleUpdateStatus = (newStatus: CaseStatusIdentifier) => {
    setPendingStatus(newStatus)
    updateStatus(newStatus)
  }

  const isUserResponsible =
    user?.id === caseData.agenteAcolhida?.id ||
    user?.id === caseData.especialistaPAEFI?.id

  const allowedActions =
    caseTransitions[caseData.status as CaseStatusIdentifier]?.filter(
      (action) =>
        action.type === 'status' &&
        (isUserResponsible || user?.cargo === 'Gerente') &&
        action.allowedRoles.includes(user?.cargo ?? ''),
    ) || []

  if (allowedActions.length === 0) return null

  return (
    <div className="rounded-lg border bg-background p-4">
      <h3 className="text-base font-semibold text-foreground">Ações Rápidas</h3>
      <div className="mt-4 flex flex-wrap gap-4">
        {allowedActions.map((action) => (
          <AlertDialog key={action.label}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isPending}
                className={clsx('w-48 justify-center', action.style, 'text-white')}
              >
                {isPending && pendingStatus === action.nextStatus ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  action.label
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá alterar o status do caso para "{action.nextStatus?.replace(/_/g, ' ')}". Esta ação não pode ser desfeita facilmente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleUpdateStatus(action.nextStatus as CaseStatusIdentifier)}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </div>
    </div>
  )
}