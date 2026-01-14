// frontend/src/components/CaseStatusBadge.tsx
import { Badge } from '@/components/ui/badge'
import { type CaseStatusType } from '@/constants/cases/definitions'
import { STATUS_CONFIG } from '@/constants/cases/styles' // <--- Importe a configuração visual aqui
import { clsx } from 'clsx'

interface CaseStatusBadgeProps {
  status: string | CaseStatusType | null | undefined
  className?: string
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  // 1. Normaliza para garantir que seja uma chave válida
  const rawStatus = String(status || '').trim() as CaseStatusType
  
  // 2. Busca a configuração visual (Label + Style) no arquivo de estilos
  // Usa um fallback caso o status não exista no mapa
  const config = STATUS_CONFIG[rawStatus]

  // Fallback visual para status desconhecidos
  if (!config) {
    return (
      <Badge 
        variant="outline" 
        className={clsx('bg-muted text-muted-foreground whitespace-nowrap', className)}
      >
        {status || 'Desconhecido'}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={clsx(
        'whitespace-nowrap border-transparent bg-opacity-15 hover:bg-opacity-25', // Ajuste fino de opacidade se necessário
        config.style, // <--- Aqui pegamos a classe do Tailwind
        className
      )}
    >
      {config.label} {/* <--- Aqui pegamos o texto formatado (ex: "Aguardando Acolhida") */}
    </Badge>
  )
}