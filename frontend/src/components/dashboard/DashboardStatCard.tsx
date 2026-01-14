// frontend/src/components/dashboard/DashboardStatCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- CONFIGURAÇÃO DE VARIANTES ---
const VARIANTS = {
  default: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800"
  },
  green: { // Mapeado para Emerald
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800"
  },
  emerald: { // Alias explícito
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800"
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800"
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-800"
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-200 dark:border-purple-800"
  }
}

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
    label?: string
    isPositive?: boolean // If undefined, considered neutral
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

  const displayValue = typeof value === 'number' 
    ? new Intl.NumberFormat('pt-BR').format(value) 
    : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05, // Faster stagger
        ease: "easeOut" 
      }}
      className="w-full h-full"
    >
      <Card className="h-full relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 rounded-xl border-border/60 bg-card/50 backdrop-blur-sm group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight line-clamp-1">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-lg transition-colors shrink-0 ml-2", styles.bg)}>
            {/* ClassName override allows parent to force specific text colors (e.g. text-blue-500) */}
            <Icon className={cn("h-4 w-4", styles.text, className)} />
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 py-1">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-full opacity-60" />
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums">
                  {displayValue ?? '-'}
                </div>
                
                {trend && (
                  <div className={cn(
                    "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-0.5",
                    trend.isPositive === true ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    trend.isPositive === false ? "text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400" :
                    "text-muted-foreground bg-muted"
                  )}>
                    {trend.isPositive === true ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5"/> : 
                     trend.isPositive === false ? <ArrowDownRight className="h-2.5 w-2.5 mr-0.5"/> :
                     <Minus className="h-2.5 w-2.5 mr-0.5"/>}
                    {Math.abs(trend.value)}%
                  </div>
                )}
              </div>

              {description && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium opacity-80 line-clamp-2">
                  {description}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}