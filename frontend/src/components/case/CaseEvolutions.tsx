// frontend/src/components/case/CaseEvolutions.tsx
import { useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Send, FileText, Loader2, PlusCircle, Lock, EyeOff, ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { Evolution } from '@/types/case'

// Interface da resposta paginada do Backend v4.0.0
interface PaginatedEvolutions {
  items: Evolution[]
  total: number
  page: number
  totalPages: number
}

interface CaseEvolutionsProps {
  caseId: string
}

export function CaseEvolutions({ caseId }: CaseEvolutionsProps) {
  const queryClient = useQueryClient()
  const [newEvolution, setNewEvolution] = useState("")
  const [isSecret, setIsSecret] = useState(false)

  // 1. Busca Infinita (Paginação)
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
        params: {
          page: pageParam,
          pageSize: 10 // Carrega 10 por vez
        }
      })
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
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
      // Reinicia a lista para mostrar o novo item no topo
      queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", caseId] })
    },
    onError: () => toast.error("Erro ao salvar evolução.")
  })

  // Helper para verificar se existem itens
  const isEmpty = !data?.pages[0]?.items.length

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* --- ÁREA DE CRIAÇÃO --- */}
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
              <Checkbox id="sigilo" checked={isSecret} onCheckedChange={(c) => setIsSecret(!!c)} />
              <Label htmlFor="sigilo" className="text-sm cursor-pointer select-none flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5" /> Marcar como Sigiloso
              </Label>
            </div>
          </div>

          <Textarea
            placeholder={isSecret
              ? "ATENÇÃO: Esta evolução será visível apenas para você e para a gerência."
              : "Descreva o atendimento, observações técnicas ou encaminhamentos..."
            }
            className="min-h-[100px] bg-background resize-none focus-visible:ring-primary"
            value={newEvolution}
            onChange={(e) => setNewEvolution(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => addEvolution()}
              disabled={isPending || !newEvolution.trim()}
              className={isSecret ? "bg-amber-600 hover:bg-amber-700 text-white" : "gap-2"}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSecret ? "Registrar sob Sigilo" : "Registrar Evolução"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* --- TIMELINE PAGINADA --- */}
      <div className="space-y-6">

        {isLoading && (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma evolução registrada neste caso.</p>
          </div>
        )}

        {/* Renderização dos grupos de páginas */}
        {data?.pages.map((page, pageIndex) => (
          <div key={pageIndex} className="space-y-6">
            {page.items.map((evo) => (
              <div key={evo.id} className="flex gap-4 group">
                {/* Coluna Esquerda (Avatar + Linha) */}
                <div className="flex flex-col items-center">
                  <Avatar className={`h-10 w-10 border-2 shadow-sm ${evo.sigilo ? 'border-amber-200' : 'border-background'}`}>
                    <AvatarFallback className={evo.sigilo ? "bg-amber-100 text-amber-700 font-bold" : "bg-slate-200 text-slate-600 font-bold"}>
                      {evo.sigilo ? <Lock className="h-4 w-4" /> : (evo.autor?.nome?.charAt(0).toUpperCase() || "U")}
                    </AvatarFallback>
                  </Avatar>
                  {/* Linha conectora vertical */}
                  <div className="w-px h-full bg-border mt-2 group-last:hidden" />
                </div>

                {/* Card Conteúdo */}
                <div className="flex-1 pb-2">
                  <Card className={`shadow-sm border transition-shadow hover:shadow-md ${evo.sigilo ? 'bg-amber-50/50 border-amber-200' : 'border-border/60'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-bold text-foreground flex items-center gap-2">
                            {evo.autor?.nome}
                            {evo.sigilo && <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 border-amber-300 text-amber-800 px-1.5">SIGILO</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {evo.autor?.cargo?.replace('_', ' ') || 'Técnico'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-full border whitespace-nowrap" title={format(new Date(evo.createdAt), "PPPppp", { locale: ptBR })}>
                          {format(new Date(evo.createdAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {evo.conteudo}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Botão Carregar Mais */}
        {hasNextPage && (
          <div className="flex justify-center pt-4 pb-8">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="gap-2 min-w-[200px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {isFetchingNextPage ? "Carregando..." : "Carregar Evoluções Antigas"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}