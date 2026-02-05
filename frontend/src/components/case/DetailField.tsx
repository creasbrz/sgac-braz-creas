// frontend/src/components/case/DetailField.tsx
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
  /** * 'default': Texto padrão (text-sm) - Usado em abas como Visão Geral
   * 'xs': Texto reduzido (text-[10px]/text-xs) - Usado em Sidebars
   */
  size?: 'default' | 'xs' 
}

// Configuração estática para evitar recriação em cada render
const SIZE_STYLES = {
  default: {
    label: "text-xs mb-1.5",
    value: "text-sm font-medium",
    icon: "h-3.5 w-3.5"
  },
  xs: {
    label: "text-[10px] mb-1", // Estilo compacto para Sidebars
    value: "text-xs font-medium",
    icon: "h-3 w-3"
  }
} as const

export function DetailField({
  label,
  value,
  icon: Icon,
  className,
  labelClassName,
  valueClassName,
  fallback = <span className="text-muted-foreground/60 italic font-normal text-xs">Não informado</span>,
  size = 'default'
}: DetailFieldProps) {
  
  // Verifica nulo, undefined ou string vazia/espaços
  const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

  const currentStyle = SIZE_STYLES[size]

  return (
    <div className={cn("min-w-0 group flex flex-col", className)}>
      <div
        className={cn(
          "font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5",
          currentStyle.label,
          labelClassName
        )}
      >
        {Icon && (
          <Icon 
            className={cn(currentStyle.icon, "opacity-70 text-muted-foreground/80")} 
            aria-hidden="true" 
          />
        )}
        {label}
      </div>

      <div 
        className={cn(
          "text-foreground whitespace-pre-wrap wrap-break-word leading-relaxed",
          currentStyle.value,
          valueClassName
        )}
      >
        {isEmpty ? fallback : value}
      </div>
    </div>
  )
}