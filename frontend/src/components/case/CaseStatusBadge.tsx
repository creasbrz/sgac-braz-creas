// frontend/src/components/case/CaseStatusBadge.tsx
import { Badge } from '@/components/ui/badge'
import { type CaseStatusType } from '@/constants/cases/definitions'
import { STATUS_CONFIG } from '@/constants/cases/styles'
import { cn } from '@/lib/utils'

interface CaseStatusBadgeProps {
  status: string | CaseStatusType | null | undefined
  className?: string
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  // 1. Normaliza para garantir que seja uma chave válida
  const rawStatus = String(status || '').trim() as CaseStatusType
  
  // 2. Busca a configuração visual (Label + Style)
  const config = STATUS_CONFIG[rawStatus]

  // Fallback visual para status desconhecidos
  if (!config) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          'bg-muted/50 text-muted-foreground whitespace-nowrap font-medium border-border',
          className
        )}
      >
        {status || 'Desconhecido'}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        // Estilos base modernos
        'whitespace-nowrap font-medium border shadow-sm transition-colors',
        // [CORREÇÃO] A propriedade correta definida em constants/cases/styles.ts é 'className', não 'style'
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}