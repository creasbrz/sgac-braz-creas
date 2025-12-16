// frontend/src/components/modals/AssignSpecialistModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface AssignModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  caseId: string
}

interface Specialist {
  id: string
  nome: string
  activeCasesCount?: number 
}

export function AssignSpecialistModal({ isOpen, onOpenChange, caseId }: AssignModalProps) {
  const queryClient = useQueryClient()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedSpecialistId, setSelectedSpecialistId] = useState('')

  // Busca lista de especialistas
  const { data: specialists } = useQuery<Specialist[]>({
    queryKey: ['users', 'specialists'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { role: 'Especialista', active: true } })
      return res.data
    },
    enabled: isOpen
  })

  // Mutação de Atribuição
  const { mutate: assign, isPending } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/assign`, {
        specialistId: selectedSpecialistId
      })
    },
    onSuccess: () => {
      toast.success('Caso atribuído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      onOpenChange(false)
      setSelectedSpecialistId('')
    },
    onError: () => toast.error('Erro ao atribuir caso.')
  })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Atribuir Especialista</DialogTitle>
          <DialogDescription>
            Selecione o técnico de referência para a <strong>Acolhida Especializada</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between"
              >
                {selectedSpecialistId
                  ? specialists?.find((s) => s.id === selectedSpecialistId)?.nome
                  : "Selecione o técnico..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Buscar especialista..." />
                <CommandList>
                  <CommandEmpty>Nenhum técnico encontrado.</CommandEmpty>
                  <CommandGroup>
                    {specialists?.map((framework) => (
                      <CommandItem
                        key={framework.id}
                        value={framework.nome}
                        onSelect={() => {
                          setSelectedSpecialistId(framework.id)
                          setOpenCombobox(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSpecialistId === framework.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {framework.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => assign()} disabled={!selectedSpecialistId || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}