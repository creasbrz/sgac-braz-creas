// frontend/src/components/CaseStatusBadge.tsx
import { Badge } from '@/components/ui/badge'
import {
  CASE_STATUS_MAP,
  type CaseStatusIdentifier,
} from '@/constants/caseConstants'
import { clsx } from 'clsx'

interface CaseStatusBadgeProps {
  status: string | CaseStatusIdentifier
  className?: string
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  // Normaliza entradas (evita problemas vindos do backend)
  const normalized = String(status).trim().toUpperCase() as CaseStatusIdentifier

  const statusInfo = CASE_STATUS_MAP[normalized]

  return (
    <Badge
      variant="outline"
      className={clsx(
        'whitespace-nowrap border-transparent',
        statusInfo?.style ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {statusInfo?.text ?? normalized}
    </Badge>
  )
}
