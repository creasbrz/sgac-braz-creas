// frontend/src/components/dashboard/DashboardStatCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// --- CONFIGURAÇÃO DE VARIANTES ---
const VARIANTS = {
  default: {
    text: "text-primary",
    bg: "bg-primary/10",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  green: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-900/30",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  }
} as const

export interface DashboardStatCardProps {
  title: string
  value: number | string | undefined
  icon: LucideIcon
  variant?: keyof typeof VARIANTS
  description?: string
  index?: number
  isLoading?: boolean
  className?: string
  trend?: {
    value: number
    isPositive?: boolean
  }
}

export function DashboardStatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default', 
  description,
  index = 0,
  isLoading = false,
  className,
  trend
}: DashboardStatCardProps) {
  
  const styles = VARIANTS[variant] || VARIANTS.default

  // Garante formatação Brasileira e trata valor 0 como válido
  const displayValue = typeof value === 'number' 
    ? new Intl.NumberFormat('pt-BR').format(value) 
    : (value ?? '-')

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.04, 
        ease: "easeOut" 
      }}
      className="w-full h-full"
    >
      <Card className={cn(
        "h-full relative overflow-hidden transition-shadow duration-300",
        "rounded-xl border-border/50 bg-card/50 backdrop-blur-md shadow-sm hover:shadow-md",
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-lg shrink-0 transition-colors", styles.bg)}>
            <Icon className={cn("h-4 w-4", styles.text)} aria-hidden="true" />
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-1">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-3 w-full max-w-35 rounded-full opacity-50" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {displayValue}
                </div>
                
                {trend && (
                  <div className={cn(
                    "flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
                    trend.isPositive === true ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400" :
                    trend.isPositive === false ? "text-rose-700 bg-rose-100 dark:bg-rose-500/20 dark:text-rose-400" :
                    "text-muted-foreground bg-muted"
                  )}>
                    {trend.isPositive === true ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : 
                     trend.isPositive === false ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> :
                     <Minus className="h-3 w-3 mr-0.5" />}
                    {Math.abs(trend.value)}%
                  </div>
                )}
              </div>

              {description && (
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug font-medium line-clamp-2 min-h-10">
                  {description}
                </p>
              )}
            </div>
          )}
        </CardContent>

        {/* Efeito visual sutil de brilho no topo */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-border/40 to-transparent" />
      </Card>
    </motion.div>
  )
}