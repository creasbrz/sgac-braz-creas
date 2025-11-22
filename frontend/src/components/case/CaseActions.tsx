// frontend/src/components/case/CaseActions.tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getAvailableActions } from '@/constants/caseTransitions' //
import { Button } from '@/components/ui/button' //
import { useAuth } from '@/hooks/useAuth' //
import { api } from '@/lib/api' //
// Importa os modais da pasta correta
import { CloseCaseModal } from '@/components/modals/CloseCaseModal' //
import { AssignSpecialistModal } from '@/components/modals/AssignSpecialistModal' //
import type { CaseStatusIdentifier } from '@/constants/caseConstants' //
import type { CaseDetailData } from '@/types/case' //
import { getErrorMessage } from '@/utils/error' //

type ActionType = "status" | "close" | "assign"

interface CaseActionsProps {
  caseData: CaseDetailData
}

export function CaseActions({ caseData }: CaseActionsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isCloseModalOpen, setCloseModalOpen] = useState(false)
  const [isAssignModalOpen, setAssignModalOpen] = useState(false)

  if (!user) return null

  const actions = getAvailableActions(
    caseData.status as CaseStatusIdentifier,
    user.cargo
  )

  // --- MUTATION: Atualizar status ---
  const updateStatus = useMutation({
    mutationFn: async (nextStatus: CaseStatusIdentifier) => {
      await api.patch(`/cases/${caseData.id}/status`, { status: nextStatus })
    },
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!')
      // Invalida todas as queries relacionadas para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['recentCases'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao atualizar o status.'))
    },
  })

  const handleAction = (type: ActionType, nextStatus?: CaseStatusIdentifier) => {
    switch (type) {
      case "status":
        if (nextStatus) updateStatus.mutate(nextStatus)
        break
      case "close":
        setCloseModalOpen(true)
        break
      case "assign":
        setAssignModalOpen(true)
        break
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">

      {actions.length === 0 && (
        <span className="text-sm text-muted-foreground">
          Nenhuma ação disponível no momento.
        </span>
      )}

      {actions.map((action) => (
        <Button
          key={action.label}
          className={action.style}
          onClick={() => handleAction(action.type as ActionType, action.nextStatus)}
          disabled={action.type === "status" && updateStatus.isPending}
        >
          {action.type === "status" && updateStatus.isPending
            ? "Atualizando..."
            : action.label}
        </Button>
      ))}

      {/* Modais */}
      <CloseCaseModal
        isOpen={isCloseModalOpen}
        onOpenChange={setCloseModalOpen}
        caseId={caseData.id}
      />

      <AssignSpecialistModal
        isOpen={isAssignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        caseId={caseData.id}
      />
    </div>
  )
}