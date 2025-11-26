// frontend/src/pages/ClosedCases.tsx
import { CaseTable } from '@/components/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function ClosedCases() {
  const { user, isSessionLoading } = useAuth()

  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    )
  }

  // [CORREÇÃO] Usando chaves com underline
  const titlesByRole: Record<string, string> = {
    Gerente: 'Arquivo Morto (Todos)',
    'Agente_Social': 'Meus Casos Finalizados',
    Especialista: 'Histórico de Acompanhamentos',
  }

  const title = titlesByRole[user.cargo] ?? 'Casos Finalizados'

  const description =
    user.cargo === 'Gerente'
      ? 'Consulta completa ao histórico de casos desligados da unidade.'
      : 'Consulte os casos que você atendeu e já foram desligados.'

  return (
    <CaseTable
      title={title}
      description={description}
      endpoint="/cases/closed"
    />
  )
}