// frontend/src/components/case/CaseEvolutions.tsx
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Send, FileText, Loader2, PlusCircle, Lock, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge" // [CORREÇÃO] Adicionado import que faltava
import type { Evolution } from '@/types/case'

interface CaseEvolutionsProps {
  caseId: string
}

export function CaseEvolutions({ caseId }: CaseEvolutionsProps) {
  const queryClient = useQueryClient()
  const [newEvolution, setNewEvolution] = useState("")
  const [isSecret, setIsSecret] = useState(false)

  // 1. Buscar Evoluções
  const { data: evolutions = [], isLoading } = useQuery<Evolution[]>({
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

  return (
    <div className="space-y-8">
      
      {/* --- ÁREA DE CRIAÇÃO --- */}
      <Card className={`border shadow-sm ${isSecret ? 'bg-amber-50 border-amber-200' : 'bg-muted/10 border-border'}`}>
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
              {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              {isSecret ? "Registrar sob Sigilo" : "Registrar Evolução"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* --- TIMELINE --- */}
      <div className="space-y-6">
        
        {isLoading && <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground"/></div>}
        
        {!isLoading && evolutions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma evolução registrada neste caso.</p>
          </div>
        )}

        {evolutions.map((evo) => (
          <div key={evo.id} className="flex gap-4 group">
            {/* Coluna Esquerda */}
            <div className="flex flex-col items-center">
              <Avatar className={`h-10 w-10 border-2 shadow-sm ${evo.sigilo ? 'border-amber-200' : 'border-background'}`}>
                <AvatarFallback className={evo.sigilo ? "bg-amber-100 text-amber-700 font-bold" : "bg-slate-200 text-slate-600 font-bold"}>
                  {evo.sigilo ? <Lock className="h-4 w-4" /> : (evo.autor?.nome?.charAt(0).toUpperCase() || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="w-px h-full bg-border mt-2 group-last:hidden" />
            </div>

            {/* Card Conteúdo */}
            <div className="flex-1 pb-6">
              <Card className={`shadow-sm border transition-shadow ${evo.sigilo ? 'bg-amber-50/50 border-amber-200' : 'border-border/60'}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        {evo.autor?.nome}
                        {evo.sigilo && <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 border-amber-300 text-amber-800 px-1.5">SIGILO</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {evo.autor?.cargo?.replace('_', ' ') || 'Técnico'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-full border whitespace-nowrap">
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