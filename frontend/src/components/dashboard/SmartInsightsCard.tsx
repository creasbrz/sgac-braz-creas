// frontend/src/components/dashboard/SmartInsightsCard.tsx
// Componente modernizado e visualmente aprimorado

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react"
import { motion } from "framer-motion"

interface SmartInsightsCardProps {
  insights: string[]
}

export function SmartInsightsCard({ insights }: SmartInsightsCardProps) {
  
  /**
   * Escolhe ícone e cor baseado no texto do insight.
   * Heurística simples, mas eficaz para UX.
   */
  const getIconConfig = (text: string) => {
    const lower = text.toLowerCase()

    // ALERTAS E RISCOS
    if (lower.includes("crítico") || lower.includes("alto") || lower.includes("⚠️"))
      return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" }

    // AUMENTO POSITIVO
    if (lower.includes("aumento") || lower.includes("crescimento"))
      return { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" }

    // QUEDA POSITIVA
    if (lower.includes("queda") || lower.includes("baixo"))
      return { icon: TrendingDown, color: "text-emerald-500", bg: "bg-emerald-500/10" }

    // INFORMAÇÕES NEUTRAS
    if (lower.includes("violação") || lower.includes("mais registrada"))
      return { icon: Info, color: "text-primary", bg: "bg-primary/10" }

    // PADRÃO
    return { icon: Lightbulb, color: "text-primary", bg: "bg-primary/10" }
  }

  return (
    <Card className="h-full border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Insights Inteligentes (IA)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        
        {/* Caso sem dados */}
        {insights.length === 0 && (
          <div className="flex items-center gap-3 text-muted-foreground text-sm py-4">
            <Info className="h-4 w-4" />
            <p>O sistema está coletando dados para gerar insights.</p>
          </div>
        )}

        {/* Lista de insights */}
        {insights.map((insight, index) => {
          const { icon: Icon, color, bg } = getIconConfig(insight)

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 
                         border border-transparent hover:border-border/50 transition-colors"
            >
              <div className={`p-2 rounded-full ${bg} shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>

              <p className="text-sm text-foreground/90 mt-1 leading-snug">
                {insight}
              </p>
            </motion.div>
          )
        })}

      </CardContent>
    </Card>
  )
}
