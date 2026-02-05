// frontend/src/components/modals/NewCaseModal.tsx
import { FilePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// [CORREÇÃO] Importar do Contexto (onde definimos o hook agora), não da pasta hooks
import { useModal } from '@/contexts/ModalContext'

import { CaseForm } from '../case/CaseForm'

export function NewCaseModal() {
  const { isNewCaseModalOpen, closeNewCaseModal } = useModal()

  return (
    <Dialog 
      open={isNewCaseModalOpen} 
      onOpenChange={(open) => {
        // Garante que a função de fechar seja chamada apenas ao fechar o modal explicitamente
        if (!open) closeNewCaseModal()
      }}
    >
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden flex flex-col h-[85vh] bg-background">
        
        {/* Header Fixo */}
        <DialogHeader className="p-6 border-b border-border bg-muted/10 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
               <FilePlus className="h-5 w-5 text-primary" />
            </div>
            Novo Caso
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 ml-1">
            Inicie um novo atendimento preenchendo os dados fundamentais da família ou indivíduo.
          </DialogDescription>
        </DialogHeader>

        {/* Área de Scroll - Permite que o footer 'sticky' do CaseForm funcione */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="p-6">
            <CaseForm onCaseCreated={closeNewCaseModal} />
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}