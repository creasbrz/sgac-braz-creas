import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetailFieldProps {
  label: string
  value: ReactNode | null | undefined
  icon?: LucideIcon
  className?: string
  labelClassName?: string
  valueClassName?: string
  fallback?: ReactNode
}

export function DetailField({
  label,
  value,
  icon: Icon,
  className,
  labelClassName,
  valueClassName,
  fallback = <span className="text-muted-foreground italic font-normal opacity-80">Não informado</span>
}: DetailFieldProps) {
  
  // Verifica se o valor é "vazio" (null, undefined ou string vazia)
  // Preserva o número 0 como valor válido
  const isEmpty = value === null || value === undefined || value === ''

  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <div
        className={cn(
          "text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5",
          labelClassName
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
        {label}
      </div>

      <div 
        className={cn(
          "text-sm font-medium text-foreground whitespace-pre-wrap break-words leading-relaxed",
          valueClassName
        )}
      >
        {isEmpty ? fallback : value}
      </div>
    </div>
  )
}