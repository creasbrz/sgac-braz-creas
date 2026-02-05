// frontend/src/components/dashboard/SmartInsightsCard.tsx
import { useMemo } from "react"
import { 
  TrendingUp, AlertTriangle, 
  Sparkles, CheckCircle2, Minus, LucideIcon, Info 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface SmartInsightsCardProps {
  insights: string[]
  isLoading?: boolean
  className?: string
}

interface InsightConfig {
  icon: LucideIcon
  color: string
  bg: string
  border: string
}

// --- LOGIC: Paleta Calibrada (Pastel 50 + Vivid 500) ---
const getIconConfig = (text: string): InsightConfig => {
  const lower = text.toLowerCase()

  // 1. ALERTAS / RISCOS (Critical - Rose)
  if (['crítico', 'alto', 'risco', 'atenção', 'urgente', 'queda', 'negativo', 'estagnado'].some(k => lower.includes(k)))
    return { 
      icon: AlertTriangle, 
      color: "text-rose-600 dark:text-rose-400", 
      bg: "bg-rose-50 dark:bg-rose-500/10", 
      border: "border-rose-100 dark:border-rose-500/20" 
    }

  // 2. CRESCIMENTO / ALTAS (Positive - Blue)
  if (['aumento', 'crescimento', 'subiu', 'alta', 'expansão', 'novos'].some(k => lower.includes(k)))
    return { 
      icon: TrendingUp, 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-50 dark:bg-blue-500/10", 
      border: "border-blue-100 dark:border-blue-500/20" 
    }

  // 3. SUCESSO / RESOLUÇÃO (Success - Emerald)
  if (['resolvido', 'concluído', 'eficaz', 'positivo', 'sucesso', 'ativo', 'monitoramento'].some(k => lower.includes(k)))
    return { 
      icon: CheckCircle2, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-50 dark:bg-emerald-500/10", 
      border: "border-emerald-100 dark:border-emerald-500/20" 
    }

  // 4. ESTABILIDADE (Neutral - Slate)
  if (['estável', 'mantém', 'igual', 'neutro', 'normal'].some(k => lower.includes(k)))
    return { 
      icon: Minus, 
      color: "text-slate-600 dark:text-slate-400", 
      bg: "bg-slate-50 dark:bg-slate-500/10", 
      border: "border-slate-100 dark:border-slate-500/20" 
    }

  // 5. DEFAULT (Info - Violet)
  return { 
    icon: Sparkles, 
    color: "text-violet-600 dark:text-violet-400", 
    bg: "bg-violet-50 dark:bg-violet-500/10", 
    border: "border-violet-100 dark:border-violet-500/20" 
  }
}

// Componente para processar o texto e destacar (Negrito antes de ':' e Números)
const FormattedText = ({ text }: { text: string }) => {
  // Separa Título da Descrição (ex: "Alerta: Aumento de 20%")
  const [title, ...rest] = text.split(':')
  const description = rest.join(':') // Junta o resto caso haja mais de um ':'

  // Se não tiver ':', trata o texto inteiro como descrição
  if (!description) {
    return <HighlightNumbers text={text} />
  }

  return (
    <span className="text-sm leading-relaxed text-muted-foreground">
      <span className="font-bold text-foreground block mb-0.5">{title}</span>
      <HighlightNumbers text={description.trim()} />
    </span>
  )
}

// Helper para destacar números e porcentagens
const HighlightNumbers = ({ text }: { text: string }) => {
  // Regex para capturar números, porcentagens e valores monetários
  const parts = text.split(/(\d+(?:[.,]\d+)?%?|\bR\$\s?\d+(?:[.,]\d+)?\b)/g)
  
  return (
    <span className="text-sm text-muted-foreground">
      {parts.map((part, i) => 
        /(\d+(?:[.,]\d+)?%?|\bR\$\s?\d+(?:[.,]\d+)?\b)/.test(part) ? (
          <span key={i} className="font-bold text-foreground mx-0.5 bg-accent/50 px-1 rounded-xs">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  )
}

export function SmartInsightsCard({ insights, isLoading = false, className }: SmartInsightsCardProps) {
  
  const processedInsights = useMemo(() => {
    return insights.map(text => ({
      text,
      config: getIconConfig(text)
    }))
  }, [insights])

  return (
    <Card className={cn("h-full border shadow-sm relative overflow-hidden group flex flex-col bg-card", className)}>
      {/* Header Gradient (Tailwind v4 syntax) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-violet-500 via-fuchsia-500 to-amber-500" />

      <CardHeader className="pb-4 pt-5 px-5 shrink-0">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          {/* Header Icon Container */}
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-linear-to-br from-violet-50 to-fuchsia-50 dark:from-violet-500/20 dark:to-fuchsia-500/20 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-100 dark:border-violet-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            Análise Inteligente
            <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider mt-0.5">
              Powered by Analytics
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-50 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted/60 p-6">
            <div className="p-3 bg-background rounded-full mb-3 shadow-sm ring-1 ring-border">
              <Info className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Sem insights no momento</p>
            <p className="text-xs opacity-70 mt-1 max-w-50">
              O sistema precisa de mais dados para gerar análises relevantes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {processedInsights.map(({ text, config }, index) => {
                const Icon = config.icon

                return (
                  <motion.div
                    key={`${index}-${text.substring(0, 15)}`}
                    initial={{ opacity: 0, x: -10, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={cn(
                      "flex gap-3.5 p-3.5 rounded-xl border transition-all duration-200",
                      "bg-card hover:bg-accent/5 hover:shadow-md hover:-translate-y-0.5",
                      config.border
                    )}
                  >
                    {/* Ícone Lateral */}
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-colors mt-0.5", 
                      config.bg, 
                      config.color
                    )}>
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                    </div>

                    {/* Conteúdo de Texto Formatado */}
                    <div className="flex-1">
                       <FormattedText text={text} />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}