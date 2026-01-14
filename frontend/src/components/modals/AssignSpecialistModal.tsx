// frontend/src/components/modals/AssignSpecialistModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, User, Briefcase, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  email?: string
  activeCases: number 
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

const getWorkloadColor = (count: number) => {
  if (count < 10) return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200"
  if (count < 20) return "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200"
  return "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-rose-200"
}

export function AssignSpecialistModal({ isOpen, onOpenChange, caseId }: AssignModalProps) {
  const queryClient = useQueryClient()
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedSpecialistId, setSelectedSpecialistId] = useState('')

  // Busca lista de especialistas com tratamento de erro e dados
  const { data: specialists = [], isLoading: isLoadingSpecialists, isError } = useQuery<Specialist[]>({
    queryKey: ['users', 'specialists-workload'],
    queryFn: async () => {
      const res = await api.get('/users/specialists')
      
      // [DEBUG] Verifique no console o que está chegando. 
      // Se aparecer { items: [...] } ou { data: [...] }, ajuste o return abaixo.
      console.log('API Especialistas:', res.data)

      // [CORREÇÃO] Blindagem contra formatos diferentes de resposta
      if (Array.isArray(res.data)) return res.data
      if (res.data && Array.isArray(res.data.data)) return res.data.data
      if (res.data && Array.isArray(res.data.items)) return res.data.items
      
      return [] 
    },
    enabled: isOpen,
    staleTime: 1000 * 60 
  })

  const { mutate: assign, isPending } = useMutation({
    mutationFn: async () => {
      await api.patch(`/cases/${caseId}/assign`, { specialistId: selectedSpecialistId })
    },
    onSuccess: () => {
      const specialistName = specialists.find(s => s.id === selectedSpecialistId)?.nome
      toast.success(`Caso atribuído a ${specialistName} com sucesso!`)
      
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      
      onOpenChange(false)
      setSelectedSpecialistId('')
    },
    onError: () => toast.error('Erro ao realizar atribuição.')
  })

  const selectedSpecialist = specialists.find((s) => s.id === selectedSpecialistId)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Atribuir Referência Técnica
          </DialogTitle>
          <DialogDescription>
            Defina quem será o responsável pelo acompanhamento deste caso (PAEFI).
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Selecione o Especialista</label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between h-12 px-3 bg-background"
                  disabled={isLoadingSpecialists}
                >
                  {isLoadingSpecialists ? (
                    <span className="flex items-center text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando equipe...
                    </span>
                  ) : selectedSpecialist ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(selectedSpecialist.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{selectedSpecialist.nome}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecione um técnico disponível...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nome..." />
                  <CommandList>
                    <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                      {isError ? "Erro ao carregar lista." : "Nenhum especialista encontrado."}
                    </CommandEmpty>
                    
                    <CommandGroup heading="Equipe Técnica">
                      {specialists.map((specialist) => (
                        <CommandItem
                          key={specialist.id}
                          // [CORREÇÃO] Value deve ser único e textual para o filtro funcionar.
                          // Adicionamos o ID para garantir unicidade, mas o nome para a busca.
                          value={`${specialist.nome} ${specialist.id}`}
                          onSelect={() => {
                            setSelectedSpecialistId(specialist.id)
                            setOpenCombobox(false)
                          }}
                          className="cursor-pointer py-3"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSpecialistId === specialist.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          
                          <div className="flex items-center flex-1 justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-8 w-8 border shrink-0">
                                <AvatarFallback className="text-xs">
                                  {getInitials(specialist.nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-sm truncate">{specialist.nome}</span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {specialist.email}
                                </span>
                              </div>
                            </div>

                            {/* Badge de Carga de Trabalho */}
                            <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 shrink-0", getWorkloadColor(specialist.activeCases || 0))}>
                              <Briefcase className="h-3 w-3" />
                              {specialist.activeCases || 0}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          {selectedSpecialist && (
             <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground flex items-center gap-2 border">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>
                  O técnico <strong>{selectedSpecialist.nome}</strong> passará a ter 
                  <strong> {(selectedSpecialist.activeCases || 0) + 1} </strong> casos ativos.
                </span>
             </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => assign()} disabled={!selectedSpecialistId || isPending} className="min-w-[140px]">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}