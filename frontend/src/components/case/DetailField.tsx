// frontend/src/components/case/DetailField.tsx
import type { ReactNode } from 'react'

interface DetailFieldProps {
  label: string
  value: ReactNode | null | undefined
  className?: string
}

export function DetailField({ label, value, className = '' }: DetailFieldProps) {
  return (
    <div className={className}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
        {value || 'Não informado'}
      </dd>
    </div>
  )
}