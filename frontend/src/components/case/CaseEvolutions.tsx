// frontend/src/components/case/CaseEvolutions.tsx
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
    'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700', 'bg-lime-100 text-lime-700', 'bg-green-100 text-green-700',
    'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700', 'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700', 'bg-purple-100 text-purple-700', 'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700', 'bg-rose-100 text-rose-700'
  ]
  let hash = 0
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
      <div className="absolute left-[15px] sm:left-[19px] top-10 bottom-0 w-px bg-border group-last:hidden" />
      
      {/* Avatar na Timeline */}
      <div className="absolute left-0 top-0">
        <Avatar className={cn(
          "h-8 w-8 sm:h-10 sm:w-10 border-2 shadow-sm transition-transform group-hover:scale-105",
          evo.sigilo ? "border-amber-200" : "border-background"
        )}>
          <AvatarFallback className={cn(
            "font-bold text-xs sm:text-sm", 
            evo.sigilo ? "bg-amber-100 text-amber-700" : getAvatarColor(evo.autor?.nome || 'U')
          )}>
            {evo.sigilo ? <Lock className="h-3 w-3 sm:h-4 sm:w-4" /> : (evo.autor?.nome?.[0] || "U")}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Conteúdo */}
      <Card className={cn(
        "mb-6 transition-all shadow-sm border",
        evo.sigilo ? "bg-amber-50/40 border-amber-200" : "hover:border-primary/30"
      )}>
        <CardContent className="p-3 sm:p-4">
          
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-2 gap-3">
            <div className="min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                 <span className="font-bold text-sm text-foreground truncate max-w-[200px] sm:max-w-md">
                   {evo.autor?.nome}
                 </span>
                 {evo.sigilo && (
                   <Badge variant="outline" className="h-5 px-1.5 bg-amber-100 text-amber-800 border-amber-200 text-[10px] gap-1">
                     <Lock className="w-3 h-3"/> SIGILO
                   </Badge>
                 )}
               </div>
               <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium">
                 {evo.autor?.cargo?.replace('_', ' ') || 'Profissional'}
               </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap" title={format(new Date(evo.createdAt), "PPPppp", { locale: ptBR })}>
                {format(new Date(evo.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
              </span>
              
              {isAuthor && !isEditing && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
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
                          <AlertDialogAction onClick={() => deleteEvo()} className="bg-destructive hover:bg-destructive/90">
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
                className="min-h-[120px] bg-background text-sm"
              />
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md border">
                <div className="flex items-center space-x-2">
                  <Checkbox id={`edit-sigilo-${evo.id}`} checked={editSigilo} onCheckedChange={(c) => setEditSigilo(!!c)} />
                  <Label htmlFor={`edit-sigilo-${evo.id}`} className="text-xs cursor-pointer">Sigiloso</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                  <Button size="sm" onClick={() => saveEdit()} disabled={isSaving || !editContent.trim()}>
                    {isSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>} Salvar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words font-normal",
              evo.sigilo && "text-amber-900/80"
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
export function CaseEvolutions({ caseId }: { caseId: string }) {
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

  // Update Otimista Local
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
        "rounded-xl border shadow-sm p-1 transition-all focus-within:ring-2 focus-within:ring-primary/20",
        isSecret ? "bg-amber-50/50 border-amber-200" : "bg-card border-border"
      )}>
         <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
               <h3 className={cn("text-sm font-semibold flex items-center gap-2", isSecret ? "text-amber-700" : "text-foreground")}>
                 {isSecret ? <Lock className="h-4 w-4"/> : <PlusCircle className="h-4 w-4 text-primary"/>}
                 {isSecret ? "Novo Registro Sigiloso" : "Nova Evolução"}
               </h3>
               <div className="flex items-center space-x-2">
                 <Checkbox id="new-sigilo" checked={isSecret} onCheckedChange={(c) => setIsSecret(!!c)} />
                 <Label htmlFor="new-sigilo" className="text-xs cursor-pointer select-none">Sigiloso</Label>
               </div>
            </div>
            
            <Textarea 
               placeholder="Digite aqui o relato técnico..."
               value={newEvolution}
               onChange={e => setNewEvolution(e.target.value)}
               className="min-h-[100px] border-0 bg-transparent resize-none focus-visible:ring-0 px-0 text-sm"
            />
            
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
               <p className="text-[10px] text-muted-foreground hidden sm:block">
                  Pressione Ctrl+Enter para enviar rápido (futuro)
               </p>
               <Button size="sm" onClick={() => addEvolution()} disabled={isPending || !newEvolution.trim()} 
                 className={cn("gap-2", isSecret && "bg-amber-600 hover:bg-amber-700 text-white")}
               >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Send className="h-3 w-3"/>}
                  Registrar
               </Button>
            </div>
         </div>
      </div>

      <div className="relative">
         {isLoading ? (
            <div className="space-y-4 pt-4">
               {[1,2,3].map(i => (
                 <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted shrink-0"/>
                    <div className="flex-1 h-24 rounded-lg bg-muted"/>
                 </div>
               ))}
            </div>
         ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
               <History className="h-10 w-10 mb-2 opacity-20"/>
               <p className="text-sm">Histórico vazio.</p>
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
                  <div className="flex justify-center pt-6 relative z-10">
                     <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2 bg-background shadow-sm">
                        {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin"/> : <ChevronDown className="h-3 w-3"/>}
                        Carregar Antigos
                     </Button>
                  </div>
               )}
            </div>
         )}
      </div>
    </div>
  )
}