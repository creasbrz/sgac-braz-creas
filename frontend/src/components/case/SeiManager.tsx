// frontend/src/components/case/SeiManager.tsx
import { useState, useEffect, useId } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { FileText, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { format, isValid } from "date-fns"

import { api } from "@/lib/api"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
// [IMPORTANTE] Importando o formatador para aplicar a máscara visual
import { formatProcessoSei } from "@/utils/formatters"

interface SeiManagerProps {
  caseId: string
  numeroSei: string | null
  linkSei: string | null
  seiRespondido: boolean
  dataRespostaSei: string | null
  readOnly?: boolean
}

export function SeiManager({ 
  caseId, 
  numeroSei, 
  linkSei, 
  seiRespondido: initialStatus,
  dataRespostaSei,
  readOnly = false
}: SeiManagerProps) {
  const queryClient = useQueryClient()
  const switchId = useId() // ID único para acessibilidade
  
  // Estado local para feedback imediato na UI
  const [isResponded, setIsResponded] = useState(initialStatus)

  // Sincroniza estado local se a prop mudar externamente (ex: re-fetch)
  useEffect(() => {
    setIsResponded(initialStatus)
  }, [initialStatus])

  const { mutate: toggleSei, isPending } = useMutation({
    mutationFn: async (checked: boolean) => {
      // Atualização otimista na UI antes da requisição terminar
      setIsResponded(checked)
      
      await api.put(`/cases/${caseId}`, {
        seiRespondido: checked
      })
      return checked
    },
    onSuccess: (newState) => {
      // Invalida para garantir dados frescos (ex: dataRespostaSei gerada no back)
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      
      if (newState) {
        toast.success("Marcado como respondido!", {
          description: "O registro da resposta foi salvo com a data de hoje."
        })
      } else {
        toast.info("Status de resposta removido.")
      }
    },
    onError: () => {
      // Reverte o estado visual em caso de erro
      setIsResponded(!isResponded)
      toast.error("Erro ao atualizar status. Tente novamente.")
    }
  })

  // Se não tiver dados do SEI, exibe estado vazio
  if (!numeroSei && !linkSei) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
        <AlertCircle className="h-4 w-4" />
        <span>Nenhum Processo SEI vinculado.</span>
      </div>
    )
  }

  // Helper para formatar data com segurança
  const formattedDate = dataRespostaSei && isValid(new Date(dataRespostaSei))
    ? format(new Date(dataRespostaSei), "dd/MM/yyyy 'às' HH:mm")
    : null

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border transition-all",
      isResponded 
        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" 
        : "bg-white dark:bg-card border-border"
    )}>
      {/* Lado Esquerdo: Informações do SEI */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full mt-0.5 transition-colors",
          isResponded ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600"
        )}>
          <FileText className="h-5 w-5" />
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Processo SEI</span>
            {isResponded && (
              <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 h-5 px-1.5 gap-1 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="h-3 w-3" /> Respondido
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* [USO DO FORMATADOR] Aplica a máscara visual correta */}
            <span className="font-mono text-sm text-foreground/90 select-all font-medium tracking-tight">
              {formatProcessoSei(numeroSei) || "Nº não informado"}
            </span>
            
            {linkSei && (
              <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-700" asChild>
                <a href={linkSei} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  Acessar Processo <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>

          {isResponded && formattedDate && (
            <p className="text-xs text-emerald-600/90 font-medium">
              Respondido em: {formattedDate}
            </p>
          )}
        </div>
      </div>

      {/* Lado Direito: Ação (Switch) */}
      {!readOnly && (
        <div className="flex items-center gap-3 pl-2 sm:pl-0 sm:border-l sm:border-border/50 sm:ml-2">
          <div className="flex flex-col items-end gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <label 
                      htmlFor={switchId}
                      className="text-sm font-medium cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isResponded ? "Resposta Enviada" : "Marcar como Respondido"}
                    </label>
                    <Switch
                      id={switchId}
                      checked={isResponded}
                      onCheckedChange={(checked) => toggleSei(checked)}
                      disabled={isPending}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marque esta opção quando o ofício de resposta <br/>for enviado ao órgão demandante.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Atualizando...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}