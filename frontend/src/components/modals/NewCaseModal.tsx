// frontend/src/components/modals/NewCaseModal.tsx
import { FilePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useModal } from '@/hooks/useModal'
import { CaseForm } from '../case/CaseForm'

export function NewCaseModal() {
  const { isNewCaseModalOpen, closeNewCaseModal } = useModal()

  return (
    <Dialog 
      open={isNewCaseModalOpen} 
      onOpenChange={(open) => {
        // Garante que a função de fechar seja chamada apenas ao fechar o modal
        if (!open) closeNewCaseModal()
      }}
    >
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
        
        {/* Header Fixo com visual destacado */}
        <DialogHeader className="p-6 border-b bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FilePlus className="h-5 w-5 text-primary" />
            Novo Caso
          </DialogTitle>
          <DialogDescription>
            Inicie um novo atendimento preenchendo os dados fundamentais da família ou indivíduo.
          </DialogDescription>
        </DialogHeader>

        {/* Área de Scroll apenas para o formulário */}
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <CaseForm onCaseCreated={closeNewCaseModal} />
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}