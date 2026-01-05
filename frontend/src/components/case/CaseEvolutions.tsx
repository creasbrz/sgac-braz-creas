// frontend/src/components/case/CaseEvolutions.tsx
import { useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  Send, FileText, Loader2, PlusCircle, Lock, EyeOff, ChevronDown, 
  MoreVertical, Pencil, Trash2, X, Check
} from "lucide-react"
import { toast } from "sonner"
// Certifique-se de ter instalado: npm install jwt-decode
import { jwtDecode } from "jwt-decode"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"

import type { Evolution } from '@/types/case'

// --- Interfaces ---
interface PaginatedEvolutions {
  items: Evolution[]
  total: number
  page: number
  totalPages: number
}

// --- Hook para identificar o usuário logado ---
function useCurrentUserId() {
  // CORREÇÃO: Usando a chave correta do seu sistema
  const token = localStorage.getItem('@sgac-braz:token') 
  
  if (!token) return null
  try {
    const decoded: any = jwtDecode(token)
    return decoded.sub // 'sub' é o ID do usuário no JWT padrão
  } catch (error) {
    console.error("Erro ao decodificar token", error)
    return null
  }
}

// --- SUB-COMPONENTE: Item Individual de Evolução ---
function EvolutionItem({ 
  evo, 
  currentUserId, 
  onUpdate, 
  onDeleteLocal 
}: { 
  evo: Evolution, 
  currentUserId: string | null, 
  onUpdate: () => void,
  onDeleteLocal: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(evo.conteudo)
  const [editSigilo, setEditSigilo] = useState(evo.sigilo)
  
  // Verifica se o usuário logado é o autor desta evolução
  const isAuthor = currentUserId === evo.autor?.id

  // Mutation: Salvar Edição
  const { mutate: saveEdit, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      await api.patch(`/evolutions/${evo.id}`, { conteudo: editContent, sigilo: editSigilo })
    },
    onSuccess: () => {
      toast.success("Evolução atualizada.")
      setIsEditing(false)
      onUpdate() // Atualiza dados do servidor em background
    },
    onError: () => toast.error("Erro ao atualizar evolução.")
  })

  // Mutation: Excluir
  const { mutate: deleteEvo, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      await api.delete(`/evolutions/${evo.id}`)
    },
    onSuccess: () => {
      // 1. Remove da tela instantaneamente (Otimista)
      onDeleteLocal(evo.id)
      toast.success("Evolução removida.")
      
      // 2. Garante sincronia com o servidor
      onUpdate()
    },
    onError: () => toast.error("Erro ao remover evolução.")
  })

  return (
    <div className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2">
      {/* Coluna Esquerda (Avatar) */}
      <div className="flex flex-col items-center">
        <Avatar className={`h-10 w-10 border-2 shadow-sm ${evo.sigilo ? 'border-amber-200' : 'border-background'}`}>
          <AvatarFallback className={evo.sigilo ? "bg-amber-100 text-amber-700 font-bold" : "bg-slate-200 text-slate-600 font-bold"}>
            {evo.sigilo ? <Lock className="h-4 w-4" /> : (evo.autor?.nome?.charAt(0).toUpperCase() || "U")}
          </AvatarFallback>
        </Avatar>
        <div className="w-px h-full bg-border mt-2 group-last:hidden" />
      </div>

      {/* Card Conteúdo */}
      <div className="flex-1 pb-2 min-w-0">
        <Card className={`shadow-sm border transition-all ${evo.sigilo ? 'bg-amber-50/50 border-amber-200' : 'border-border/60 hover:border-border'}`}>
          <CardContent className="p-4 relative">
            
            {/* Cabeçalho do Card */}
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
                  {evo.autor?.nome}
                  {evo.sigilo && <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 border-amber-300 text-amber-800 px-1.5 gap-1"><Lock className="w-3 h-3"/> SIGILO</Badge>}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">
                  {evo.autor?.cargo?.replace('_', ' ') || 'Técnico'}
                </p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:inline-block" title={format(new Date(evo.createdAt), "PPPppp", { locale: ptBR })}>
                  {format(new Date(evo.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>

                {/* MENU DE AÇÕES (Apenas Autor vê) */}
                {isAuthor && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           {/* Usando div para evitar aninhamento incorreto de botões */}
                           <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-red-600 focus:text-red-600 w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                           </div>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O registro será removido permanentemente do histórico.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteEvo()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirmar Exclusão"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* CONTEÚDO (Visualização vs Edição) */}
            {isEditing ? (
              <div className="space-y-3 animate-in fade-in">
                <Textarea 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)} 
                  className="min-h-[100px] bg-background"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id={`sigilo-${evo.id}`} checked={editSigilo} onCheckedChange={(c) => setEditSigilo(!!c)} />
                    <Label htmlFor={`sigilo-${evo.id}`} className="text-xs">Manter Sigilo</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1"/> Cancelar
                    </Button>
                    <Button size="sm" onClick={() => saveEdit()} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 mr-1"/>} Salvar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                {evo.conteudo}
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function CaseEvolutions({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [newEvolution, setNewEvolution] = useState("")
  const [isSecret, setIsSecret] = useState(false)
  const currentUserId = useCurrentUserId()

  // 1. Busca Infinita
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<PaginatedEvolutions>({
    queryKey: ["evolutions", caseId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/cases/${caseId}/evolutions`, {
        params: { page: pageParam, pageSize: 10 }
      })
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  // 2. Criar Evolução
  const { mutate: addEvolution, isPending } = useMutation({
    mutationFn: async () => {
      if (!newEvolution.trim()) return
      await api.post(`/cases/${caseId}/evolutions`, {
        conteudo: newEvolution,
        sigilo: isSecret
      })
    },
    onSuccess: () => {
      toast.success("Evolução registrada.")
      setNewEvolution("")
      setIsSecret(false)
      queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", caseId] })
    },
    onError: () => toast.error("Erro ao salvar evolução.")
  })

  // 3. Função para remover item do Cache Local (Atualização Otimista)
  const handleLocalDelete = (deletedId: string) => {
    queryClient.setQueryData(["evolutions", caseId], (oldData: any) => {
      if (!oldData) return oldData

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          items: page.items.filter((item: Evolution) => item.id !== deletedId)
        }))
      }
    })
  }

  const isEmpty = !data?.pages[0]?.items.length

  return (
    <div className="space-y-8 pb-10">

      {/* ÁREA DE CRIAÇÃO */}
      <Card className={`border shadow-sm transition-colors ${isSecret ? 'bg-amber-50 border-amber-200' : 'bg-muted/10 border-border'}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              {isSecret ? <Lock className="h-5 w-5 text-amber-600" /> : <PlusCircle className="h-5 w-5 text-primary" />}
              <h3 className={isSecret ? "text-amber-700" : "text-primary"}>
                {isSecret ? "Nova Evolução Sigilosa" : "Nova Evolução Técnica"}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="sigilo-new" checked={isSecret} onCheckedChange={(c) => setIsSecret(!!c)} />
              <Label htmlFor="sigilo-new" className="text-sm cursor-pointer select-none flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Marcar como Sigiloso
              </Label>
            </div>
          </div>

          <Textarea
            placeholder={isSecret ? "ATENÇÃO: Visível apenas para você e a gerência." : "Descreva o atendimento, observações técnicas ou encaminhamentos..."}
            className="min-h-[100px] bg-background resize-none focus-visible:ring-primary"
            value={newEvolution}
            onChange={(e) => setNewEvolution(e.target.value)}
          />

          <div className="flex justify-end">
            <Button onClick={() => addEvolution()} disabled={isPending || !newEvolution.trim()} className={isSecret ? "bg-amber-600 hover:bg-amber-700 text-white" : "gap-2"}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSecret ? "Registrar sob Sigilo" : "Registrar Evolução"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* LISTA DE EVOLUÇÕES */}
      <div className="space-y-6">
        {isLoading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>}
        
        {!isLoading && isEmpty && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma evolução registrada neste caso.</p>
          </div>
        )}

        {data?.pages.map((page, i) => (
          <div key={i} className="space-y-6">
            {page.items.map((evo) => (
              <EvolutionItem 
                key={evo.id} 
                evo={evo} 
                currentUserId={currentUserId}
                // Recarrega dados do servidor (segurança)
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })}
                // Remove da tela agora (velocidade)
                onDeleteLocal={handleLocalDelete}
              />
            ))}
          </div>
        ))}

        {hasNextPage && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2 min-w-[200px]">
              {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
              {isFetchingNextPage ? "Carregando..." : "Carregar Mais"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}