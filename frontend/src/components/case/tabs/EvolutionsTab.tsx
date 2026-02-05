// frontend/src/components/case/tabs/EvolutionsTab.tsx
import { useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  Send, Loader2, PlusCircle, Lock, ChevronDown, 
  MoreVertical, Pencil, Trash2, History
} from "lucide-react"
import { toast } from "sonner"
import { jwtDecode } from "jwt-decode"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import type { Evolution } from '@/types/case'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

interface PaginatedEvolutions {
  items: Evolution[]
  total: number
  page: number
  totalPages: number
}

// Hook de Auth (Simplificado)
function useCurrentUserId() {
  const token = localStorage.getItem('@sgac-braz:token') 
  if (!token) return null
  try {
    const decoded: any = jwtDecode(token)
    return decoded.sub 
  } catch (e) { return null }
}

// Helper para cor determinística de avatar
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200', 
    'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200', 
    'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', 
    'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200', 
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200', 
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200', 
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200', 
    'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  ]
  let hash = 0
  if (!name) return colors[0];
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// --- ITEM INDIVIDUAL ---
function EvolutionItem({ evo, currentUserId, onUpdate, onDeleteLocal }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(evo.conteudo)
  const [editSigilo, setEditSigilo] = useState(evo.sigilo)
  const isAuthor = currentUserId === evo.autor?.id

  const { mutate: saveEdit, isPending: isSaving } = useMutation({
    mutationFn: async () => await api.patch(`/evolutions/${evo.id}`, { conteudo: editContent, sigilo: editSigilo }),
    onSuccess: () => {
      toast.success("Atualizado!")
      setIsEditing(false)
      onUpdate()
    },
    onError: () => toast.error("Erro ao atualizar.")
  })

  const { mutate: deleteEvo, isPending: isDeleting } = useMutation({
    mutationFn: async () => await api.delete(`/evolutions/${evo.id}`),
    onSuccess: () => {
      onDeleteLocal(evo.id)
      toast.success("Removido.")
      onUpdate()
    },
    onError: () => toast.error("Erro ao remover.")
  })

  return (
    <div className="relative pl-8 sm:pl-10 group animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Linha do Tempo Vertical */}
      <div className="absolute left-3.75 sm:left-4.75 top-10 bottom-0 w-px bg-border/60 group-last:hidden" />
      
      {/* Avatar na Timeline */}
      <div className="absolute left-0 top-0 z-10">
        <Avatar className={cn(
          "h-8 w-8 sm:h-10 sm:w-10 border-2 shadow-sm transition-transform group-hover:scale-105",
          evo.sigilo ? "border-status-warning-border" : "border-background ring-1 ring-border/20"
        )}>
          <AvatarFallback className={cn(
            "font-bold text-xs sm:text-sm", 
            evo.sigilo ? "bg-status-warning-bg text-status-warning-fg" : getAvatarColor(evo.autor?.nome || 'U')
          )}>
            {evo.sigilo ? <Lock className="h-3 w-3 sm:h-4 sm:w-4" /> : (evo.autor?.nome?.[0] || "U")}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Conteúdo */}
      <Card className={cn(
        "mb-6 transition-all shadow-sm border group-hover:shadow-md",
        evo.sigilo ? "bg-status-warning-bg/10 border-status-warning-border" : "bg-card border-border hover:border-primary/20"
      )}>
        <CardContent className="p-4 sm:p-5">
          
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-3 gap-3">
            <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2 flex-wrap mb-0.5">
                 <span className="font-bold text-sm text-foreground truncate max-w-50 sm:max-w-md">
                   {evo.autor?.nome}
                 </span>
                 {evo.sigilo && (
                   <Badge variant="outline" className="h-5 px-1.5 bg-status-warning-bg text-status-warning-fg border-status-warning-border text-[10px] gap-1 shadow-sm">
                     <Lock className="w-3 h-3"/> SIGILO
                   </Badge>
                 )}
               </div>
               <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-semibold flex items-center gap-1">
                 {evo.autor?.cargo?.replace('_', ' ') || 'Profissional'}
               </p>
            </div>

            <div className="flex items-center gap-1 shrink-0 self-start -mt-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap bg-muted/30 px-2 py-1 rounded-md border border-border/30" title={format(new Date(evo.createdAt), "PPPppp", { locale: ptBR })}>
                {format(new Date(evo.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
              </span>
              
              {isAuthor && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </div>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteEvo()} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Corpo do Texto */}
          {isEditing ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              <Textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                className="min-h-30 bg-background text-sm border-primary/20 focus-visible:ring-primary/20"
              />
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md border border-border/50">
                <div className="flex items-center space-x-2 pl-1">
                  <Checkbox id={`edit-sigilo-${evo.id}`} checked={editSigilo} onCheckedChange={(c) => setEditSigilo(!!c)} />
                  <Label htmlFor={`edit-sigilo-${evo.id}`} className="text-xs cursor-pointer font-medium">Restrito (Sigiloso)</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancelar</Button>
                  <Button size="sm" onClick={() => saveEdit()} disabled={isSaving || !editContent.trim()} className="min-w-20">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin"/> : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap wrap-break-word font-normal pl-0.5",
              evo.sigilo && "text-status-warning-fg/90"
            )}>
              {evo.conteudo}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function EvolutionsTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [newEvolution, setNewEvolution] = useState("")
  const [isSecret, setIsSecret] = useState(false)
  const currentUserId = useCurrentUserId()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<PaginatedEvolutions>({
    queryKey: ["evolutions", caseId],
    queryFn: async ({ pageParam = 1 }) => (await api.get(`/cases/${caseId}/evolutions`, { params: { page: pageParam, pageSize: 10 } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined,
  })

  const { mutate: addEvolution, isPending } = useMutation({
    mutationFn: async () => {
      if (!newEvolution.trim()) return
      await api.post(`/cases/${caseId}/evolutions`, { conteudo: newEvolution, sigilo: isSecret })
    },
    onSuccess: () => {
      toast.success("Registrado!")
      setNewEvolution("")
      setIsSecret(false)
      queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })
    },
    onError: () => toast.error("Erro ao salvar.")
  })

  // Update Otimista Local (para remoção)
  const handleLocalDelete = (id: string) => {
    queryClient.setQueryData(["evolutions", caseId], (old: any) => {
      if (!old) return old
      return { ...old, pages: old.pages.map((p: any) => ({ ...p, items: p.items.filter((i: any) => i.id !== id) })) }
    })
  }

  const isEmpty = !data?.pages[0]?.items.length

  return (
    <div className="space-y-8 pb-10">
      
      {/* Editor */}
      <div className={cn(
        "rounded-xl border shadow-sm p-1 transition-all focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/30",
        isSecret ? "bg-status-warning-bg/20 border-status-warning-border" : "bg-card border-border"
      )}>
         <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
               <h3 className={cn("text-sm font-bold flex items-center gap-2", isSecret ? "text-status-warning-fg" : "text-foreground")}>
                 {isSecret ? <Lock className="h-4 w-4"/> : <PlusCircle className="h-4 w-4 text-primary"/>}
                 {isSecret ? "Novo Registro Sigiloso" : "Nova Evolução"}
               </h3>
               <div className="flex items-center space-x-2 bg-muted/30 px-2 py-1 rounded border border-border/50">
                 <Checkbox id="new-sigilo" checked={isSecret} onCheckedChange={(c) => setIsSecret(!!c)} />
                 <Label htmlFor="new-sigilo" className="text-xs cursor-pointer select-none font-medium">Restrito</Label>
               </div>
            </div>
            
            <Textarea 
               placeholder="Digite aqui o relato técnico..."
               value={newEvolution}
               onChange={e => setNewEvolution(e.target.value)}
               className="min-h-25 border-0 bg-transparent resize-none focus-visible:ring-0 px-0 text-sm placeholder:text-muted-foreground/50"
            />
            
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
               <p className="text-[10px] text-muted-foreground hidden sm:block italic opacity-70">
                  Registros técnicos são imutáveis após 24h.
               </p>
               <Button size="sm" onClick={() => addEvolution()} disabled={isPending || !newEvolution.trim()} 
                 className={cn("gap-2 shadow-sm font-medium", isSecret && "bg-status-warning-fg hover:bg-status-warning-fg/90 text-white")}
               >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Send className="h-3 w-3"/>}
                  Registrar
               </Button>
            </div>
         </div>
      </div>

      <div className="relative">
         {isLoading ? (
           <div className="space-y-6 pt-4 px-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                   <div className="h-10 w-10 rounded-full bg-muted/60 shrink-0"/>
                   <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted/60 rounded"/>
                      <div className="h-20 w-full bg-muted/40 rounded-lg"/>
                   </div>
                </div>
              ))}
           </div>
         ) : isEmpty ? (
           <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5 gap-3">
              <div className="p-3 bg-muted/50 rounded-full">
                 <History className="h-8 w-8 opacity-40"/>
              </div>
              <p className="text-sm font-medium">Nenhum histórico registrado.</p>
           </div>
         ) : (
           <div className="space-y-0 relative">
              {data?.pages.map((page, i) => (
                 <div key={i}>
                    {page.items.map(evo => (
                       <EvolutionItem 
                         key={evo.id} 
                         evo={evo} 
                         currentUserId={currentUserId} 
                         onUpdate={() => queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })}
                         onDeleteLocal={handleLocalDelete}
                       />
                    ))}
                 </div>
              ))}
              
              {hasNextPage && (
                 <div className="flex justify-center pt-8 relative z-10 pb-4">
                    <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2 bg-background shadow-sm border-border/60 hover:bg-muted/50">
                       {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <ChevronDown className="h-3.5 w-3.5"/>}
                       Carregar Mais Antigos
                    </Button>
                 </div>
              )}
           </div>
         )}
      </div>
    </div>
  )
}