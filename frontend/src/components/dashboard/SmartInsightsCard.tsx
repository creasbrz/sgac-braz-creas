// frontend/src/components/dashboard/SmartInsightsCard.tsx
import { 
  Lightbulb, TrendingUp, AlertTriangle, 
  Sparkles, CheckCircle2, Minus, LucideIcon 
} from "lucide-react"
import { motion } from "framer-motion"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

// --- LOGIC ---
// Moved outside component to be static and testable
const getIconConfig = (text: string): InsightConfig => {
  const lower = text.toLowerCase()

  // 1. ALERTAS / RISCOS (Critical)
  if (['crítico', 'alto', 'risco', 'atenção', 'urgente', 'queda brusca'].some(k => lower.includes(k)))
    return { 
      icon: AlertTriangle, 
      color: "text-rose-600 dark:text-rose-400", 
      bg: "bg-rose-50 dark:bg-rose-900/20", 
      border: "border-rose-200 dark:border-rose-800" 
    }

  // 2. CRESCIMENTO (Positive/Neutral)
  if (['aumento', 'crescimento', 'subiu', 'alta', 'expansão'].some(k => lower.includes(k)))
    return { 
      icon: TrendingUp, 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-50 dark:bg-blue-900/20", 
      border: "border-blue-200 dark:border-blue-800" 
    }

  // 3. MELHORIA / RESOLUÇÃO (Positive)
  if (['queda', 'redução', 'diminuiu', 'resolvido', 'concluído', 'eficaz', 'positivo', 'otimizado'].some(k => lower.includes(k)))
    return { 
      icon: CheckCircle2, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-50 dark:bg-emerald-900/20", 
      border: "border-emerald-200 dark:border-emerald-800" 
    }

  // 4. QUEDA NEGATIVA (Negative) - Context dependent, usually handled by "Risk" but added for nuance if needed
  // ...

  // 5. ESTABILIDADE (Neutral)
  if (['estável', 'mantém', 'igual', 'neutro'].some(k => lower.includes(k)))
    return { 
      icon: Minus, 
      color: "text-slate-600 dark:text-slate-400", 
      bg: "bg-slate-100 dark:bg-slate-800", 
      border: "border-slate-200 dark:border-slate-700" 
    }

  // 6. DEFAULT (Info)
  return { 
    icon: Sparkles, // Changed default to Sparkles to emphasize AI nature
    color: "text-violet-600 dark:text-violet-400", 
    bg: "bg-violet-50 dark:bg-violet-900/20", 
    border: "border-violet-200 dark:border-violet-800" 
  }
}

export function SmartInsightsCard({ insights, isLoading = false, className }: SmartInsightsCardProps) {
  return (
    <Card className={cn("h-full border shadow-sm relative overflow-hidden group flex flex-col", className)}>
      {/* AI Indicator Gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500" />

      <CardHeader className="pb-4 pt-5 px-5 shrink-0">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/40 dark:to-fuchsia-900/40 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-200/50">
            <Sparkles className="h-4 w-4" />
          </div>
          Análise Inteligente
        </CardTitle>
      </CardHeader>

      <CardContent className="px-5 pb-5 flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted/60 p-6">
            <div className="p-3 bg-background rounded-full mb-3 shadow-sm">
              <Lightbulb className="h-6 w-6 text-amber-500/50" />
            </div>
            <p className="text-sm font-medium text-foreground">Sem insights no momento</p>
            <p className="text-xs opacity-70 mt-1 max-w-[200px]">
              O sistema precisa de mais dados para gerar análises relevantes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const { icon: Icon, color, bg, border } = getIconConfig(insight)

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={cn(
                    "flex gap-3.5 p-3.5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 duration-200",
                    "bg-card hover:bg-accent/5",
                    border
                  )}
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm", bg, color)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <p className="text-sm text-muted-foreground font-medium leading-relaxed pt-0.5">
                    {/* Highlight key numbers if present using regex could be an enhancement here, 
                        but keeping it simple for now */}
                    {insight}
                  </p>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}