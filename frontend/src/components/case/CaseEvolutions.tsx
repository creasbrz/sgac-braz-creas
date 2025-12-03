import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Send, FileText, Loader2, PlusCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface CaseEvolutionsProps {
  caseId: string
}

export function CaseEvolutions({ caseId }: CaseEvolutionsProps) {
  const queryClient = useQueryClient()
  const [newEvolution, setNewEvolution] = useState("")

  // 1. Buscar Evoluções
  const { data: evolutions = [], isLoading } = useQuery({
    queryKey: ["evolutions", caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/evolutions`)
      return res.data
    },
  })

  // 2. Criar Evolução
  const { mutate: addEvolution, isPending } = useMutation({
    mutationFn: async () => {
      if (!newEvolution.trim()) return
      await api.post(`/cases/${caseId}/evolutions`, { conteudo: newEvolution })
    },
    onSuccess: () => {
      toast.success("Evolução registrada.")
      setNewEvolution("")
      queryClient.invalidateQueries({ queryKey: ["evolutions", caseId] })
      queryClient.invalidateQueries({ queryKey: ["case-logs", caseId] }) // Atualiza o histórico também
    },
    onError: () => toast.error("Erro ao salvar evolução.")
  })

  return (
    <div className="space-y-8">
      
      {/* --- ÁREA DE CRIAÇÃO (EM DESTAQUE) --- */}
      <Card className="border-primary/20 shadow-sm bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold mb-2">
            <PlusCircle className="h-5 w-5" />
            <h3>Nova Evolução Técnica</h3>
          </div>
          <Textarea 
            placeholder="Descreva o atendimento, observações técnicas ou encaminhamentos..." 
            className="min-h-[100px] bg-background resize-none focus-visible:ring-primary"
            value={newEvolution}
            onChange={(e) => setNewEvolution(e.target.value)}
          />
          <div className="flex justify-end">
            <Button 
              onClick={() => addEvolution()} 
              disabled={isPending || !newEvolution.trim()}
              className="gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              Registrar Evolução
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* --- TIMELINE DE EVOLUÇÕES --- */}
      <div className="space-y-6">
        {isLoading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground"/></div>}
        
        {!isLoading && evolutions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma evolução registrada neste caso.</p>
          </div>
        )}

        {evolutions.map((evo: any) => (
          <div key={evo.id} className="flex gap-4 group">
            {/* Coluna Esquerda (Avatar + Linha) */}
            <div className="flex flex-col items-center">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">
                  {evo.autor?.nome?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {/* Linha vertical conectora */}
              <div className="w-px h-full bg-border mt-2 group-last:hidden" />
            </div>

            {/* Conteúdo (Card) */}
            <div className="flex-1 pb-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow border-border/60">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{evo.autor?.nome}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{evo.autor?.cargo?.replace('_', ' ')}</p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full whitespace-nowrap">
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
    </div>
  )
}