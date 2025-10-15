// frontend/src/components/NewCaseModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useModal } from '@/hooks/useModal'
import { CaseForm } from './CaseForm'

export function NewCaseModal() {
  const { isNewCaseModalOpen, closeNewCaseModal } = useModal()

  return (
    <Dialog open={isNewCaseModalOpen} onOpenChange={closeNewCaseModal}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Novo Caso</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registar um novo atendimento.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto p-1 pr-4">
          {/* O formulário agora fecha o modal quando um caso é criado com sucesso */}
          <CaseForm onCaseCreated={closeNewCaseModal} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

