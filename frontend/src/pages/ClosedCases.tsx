// frontend/src/pages/ClosedCases.tsx
import { CaseTable } from '@/components/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function ClosedCases() {
  const { user, isSessionLoading } = useAuth()

  // Loader inicial (igual ao Cases.tsx)
  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Caso raro mas importante: usuário nulo após validar sessão
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    )
  }

  // Título dinâmico por cargo
  const titlesByRole = {
    Gerente: 'Todos os Casos Finalizados',
    'Agente Social': 'Meus Casos Finalizados',
    Especialista: 'Meus Casos Finalizados',
  }

  const title = titlesByRole[user.cargo] ?? 'Casos Finalizados'

  // Descrição por cargo
  const description =
    user.cargo === 'Gerente'
      ? 'Consulte todos os casos finalizados do sistema.'
      : 'Consulte todos os seus casos que já foram desligados.'

  return (
    <CaseTable
      title={title}
      description={description}
      endpoint="/cases/closed"
    />
  )
}
