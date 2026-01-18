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

export function DetailField({
  label,
  value,
  icon: Icon,
  className,
  labelClassName,
  valueClassName,
  fallback = <span className="text-muted-foreground italic font-normal opacity-80">Não informado</span>,
  size = 'default'
}: DetailFieldProps) {
  
  const isEmpty = value === null || value === undefined || value === ''

  // Configuração de tamanhos baseada no Design System do CaseDetail
  const styles = {
    default: {
      label: "text-xs mb-1.5",
      value: "text-sm",
      icon: "h-3.5 w-3.5"
    },
    xs: {
      label: "text-[10px] mb-1", // Estilo da SidebarInfo
      value: "text-xs font-medium",
      icon: "h-3 w-3"
    }
  }

  const currentStyle = styles[size]

  return (
    <div className={cn("min-w-0 group", className)}>
      <div
        className={cn(
          "font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5",
          currentStyle.label,
          labelClassName
        )}
      >
        {Icon && <Icon className={cn(currentStyle.icon, "opacity-70")} />}
        {label}
      </div>

      <div 
        className={cn(
          "text-foreground whitespace-pre-wrap break-words leading-relaxed",
          currentStyle.value,
          // Se for default, mantém font-medium, se xs, já aplicamos acima
          size === 'default' && "font-medium", 
          valueClassName
        )}
      >
        {isEmpty ? fallback : value}
      </div>
    </div>
  )
}