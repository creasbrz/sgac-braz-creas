// frontend/src/components/NewCaseModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog' //
import { useModal } from '@/hooks/useModal' //
import { CaseForm } from './CaseForm' //

export function NewCaseModal() {
  const { isNewCaseModalOpen, closeNewCaseModal } = useModal() //

  return (
    <Dialog
      open={isNewCaseModalOpen} //
      onOpenChange={(open) => {
        // Se o modal está tentando fechar (open = false), fechamos via hook
        if (!open) closeNewCaseModal() //
      }}
    >
      <DialogContent className="sm:max-w-[900px] p-0"> {/* Remove padding padrão para layout customizado */}
        <DialogHeader className="p-6 pb-2"> {/* Padding específico para o header */}
          <DialogTitle>Novo Caso</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registar um novo atendimento.
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com scroll interno e Header fixo */}
        <div className="max-h-[80vh] overflow-y-auto px-6 pb-6"> {/* */}
          <CaseForm onCaseCreated={closeNewCaseModal} />
        </div>
      </DialogContent>
    </Dialog>
  )
}