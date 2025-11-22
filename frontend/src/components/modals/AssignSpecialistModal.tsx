// frontend/src/components/modals/AssignSpecialistModal.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api' //
import { useSpecialists } from '@/hooks/api/useCaseQueries' //
import { getErrorMessage } from '@/utils/error' //
import { Button } from '@/components/ui/button' //
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog' //
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select' //
import { Label } from '@/components/ui/label' //

interface AssignSpecialistModalProps {
  caseId: string
  isOpen: boolean
  onClose: () => void
}

export function AssignSpecialistModal({
  caseId,
  isOpen,
  onClose,
}: AssignSpecialistModalProps) {
  const queryClient = useQueryClient()
  const [selectedSpecialist, setSelectedSpecialist] = useState('')

  // Busca a lista de especialistas disponíveis
  const { data: specialists, isLoading: isLoadingSpecialists } =
    useSpecialists() //

  // Mutation para atribuir o especialista
  const { mutate: assignSpecialist, isPending } = useMutation({
    mutationFn: async (specialistId: string) => {
      return await api.patch(`/cases/${caseId}/assign`, { specialistId }) //
    },
    onSuccess: () => {
      toast.success('Especialista atribuído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] }) //
      queryClient.invalidateQueries({ queryKey: ['case', caseId] }) //
      onClose() // Fecha o modal
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao atribuir especialista.')) //
    },
  })

  const handleAssign = () => {
    if (!selectedSpecialist) {
      toast.error('Por favor, selecione um especialista.')
      return
    }
    assignSpecialist(selectedSpecialist)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Especialista PAEFI</DialogTitle>
          <DialogDescription>
            Selecione o profissional que ficará responsável pelo acompanhamento
            PAEFI deste caso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="specialist">Especialista</Label>
            <Select
              onValueChange={setSelectedSpecialist}
              value={selectedSpecialist}
              disabled={isLoadingSpecialists || isPending}
            >
              <SelectTrigger id="specialist">
                <SelectValue
                  placeholder={
                    isLoadingSpecialists ? 'A carregar...' : 'Selecione...'
                  }
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
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isPending || !selectedSpecialist}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}