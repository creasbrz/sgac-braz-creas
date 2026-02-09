// frontend/src/components/modals/LinkCaseModal.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Link as LinkIcon, Loader2, ArrowRightLeft, UserCheck, Baby, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface LinkCaseModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentCaseId: string
  currentCaseName: string
}

export function LinkCaseModal({ isOpen, onOpenChange, currentCaseId, currentCaseName }: LinkCaseModalProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState<{ id: string, nome: string, cpf: string } | null>(null)
  const [linkType, setLinkType] = useState<'parent' | 'child'>('parent') 
  
  const { data: results = [], isLoading: isSearching } = useQuery({
    queryKey: ['cases-search-link', search],
    queryFn: async () => {
      if (!search || search.length < 3) return []
      const res = await api.get('/cases', { params: { search, pageSize: 5 } })
      return res.data.data.filter((c: any) => c.id !== currentCaseId)
    },
    enabled: search.length >= 3
  })

  const { mutate: linkCases, isPending: isLinking } = useMutation({
    mutationFn: async () => {
      if (!selectedCase) return

      // Lógica de Vínculo:
      // Se linkType == 'parent': O selecionado é PAI do atual.
      // Se linkType == 'child': O atual é PAI do selecionado.
      if (linkType === 'parent') {
        await api.patch(`/cases/${currentCaseId}`, { 
          casoPrincipalId: selectedCase.id 
        })
      } else {
        await api.patch(`/cases/${selectedCase.id}`, { 
          casoPrincipalId: currentCaseId 
        })
      }
    },
    onSuccess: () => {
      toast.success("Vínculo criado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ['case', currentCaseId] })
      queryClient.invalidateQueries({ queryKey: ['case', selectedCase?.id] })
      handleClose()
    },
    onError: () => toast.error("Erro ao vincular prontuários.")
  })

  const handleClose = () => {
    onOpenChange(false)
    setSearch('')
    setSelectedCase(null)
    setLinkType('parent')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20"><LinkIcon className="h-4 w-4 text-primary"/></div>
            Vincular Prontuários
          </DialogTitle>
          <DialogDescription>
            Associe o prontuário de <strong>{currentCaseName}</strong> a outro existente no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          
          {/* 1. Seleção do Caso */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">1. Buscar Prontuário Alvo</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Digite o nome ou CPF..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {selectedCase && (
               <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-background">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{selectedCase.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-primary">Selecionado: {selectedCase.nome}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">CPF: {selectedCase.cpf}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCase(null)} className="h-7 text-xs">Alterar</Button>
               </div>
            )}

            {!selectedCase && (
              <ScrollArea className="h-40 border rounded-md p-1 bg-muted/5">
                {search.length < 3 && <div className="flex justify-center items-center h-full text-xs text-muted-foreground">Digite 3 letras para buscar...</div>}
                {isSearching && <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>}
                {!isSearching && search.length >= 3 && results.length === 0 && <div className="flex justify-center items-center h-full text-xs text-muted-foreground">Nenhum resultado.</div>}
                
                <div className="space-y-1">
                  {results.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCase({ id: c.id, nome: c.nomeCompleto, cpf: c.cpf || 'Não informado' })}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground text-xs">{c.nomeCompleto.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.nomeCompleto}</p>
                        <p className="text-xs text-muted-foreground">CPF: {c.cpf || 'N/A'}</p>
                      </div>
                      {c.status === 'DESLIGADO' && <Badge variant="destructive" className="h-4 text-[9px] px-1">Inativo</Badge>}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* 2. Tipo de Vínculo (Visual Cards - substitui RadioGroup) */}
          {selectedCase && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">2. Defina a Relação</Label>
              <div className="grid grid-cols-2 gap-4">
                
                {/* Opção 1: Responsável */}
                <div 
                  onClick={() => setLinkType('parent')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden",
                    linkType === 'parent' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                >
                  {linkType === 'parent' && <div className="absolute top-2 right-2 text-primary"><Check className="h-4 w-4"/></div>}
                  <UserCheck className={cn("h-6 w-6 mb-2", linkType === 'parent' ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-center w-full">
                    <p className="text-sm font-bold text-foreground truncate w-full px-1">{selectedCase.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">é o <span className="font-medium text-primary">Responsável/Pai</span></p>
                  </div>
                </div>

                {/* Opção 2: Filho */}
                <div 
                  onClick={() => setLinkType('child')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden",
                    linkType === 'child' ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10" : "border-border hover:bg-muted/50"
                  )}
                >
                  {linkType === 'child' && <div className="absolute top-2 right-2 text-purple-600"><Check className="h-4 w-4"/></div>}
                  <Baby className={cn("h-6 w-6 mb-2", linkType === 'child' ? "text-purple-600" : "text-muted-foreground")} />
                  <div className="text-center w-full">
                    <p className="text-sm font-bold text-foreground truncate w-full px-1">{selectedCase.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">é <span className="font-medium text-purple-600">Dependente/Filho</span></p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        <DialogFooter className="px-6 py-4 bg-muted/10 border-t">
          <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button onClick={() => linkCases()} disabled={!selectedCase || isLinking} className="min-w-32">
            {isLinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}