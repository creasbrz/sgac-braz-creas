// frontend/src/components/case/DetailField.tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils' // Importa o utilitário de classes padrão do projeto

interface DetailFieldProps {
  label: string
  value: ReactNode | null | undefined
  className?: string
  labelClassName?: string
}

/** Função que garante fallback apenas para null/undefined (preserva o 0) */
function safeDisplay(value: ReactNode | null | undefined) {
  if (value === null || value === undefined) {
    return '-'
  }
  return value
}

export function DetailField({
  label,
  value,
  className,
  labelClassName,
}: DetailFieldProps) {
  return (
    <div className={cn(className)}> {/* Usa cn() para classes seguras */}
      <dt
        className={cn(
          'text-sm font-medium text-muted-foreground',
          labelClassName,
        )}
      >
        {label}
      </dt>

      <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
        {safeDisplay(value)}
      </dd>
    </div>
  )
}