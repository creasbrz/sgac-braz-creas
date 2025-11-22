// frontend/src/pages/Cases.tsx
import { CaseTable } from '@/components/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function Cases() {
  const { user, isSessionLoading } = useAuth()

  // Evita piscar a interface
  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Sessão inválida (token expirado ou falha no /me)
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
    Gerente: 'Todos os Casos',
    'Agente Social': 'Casos de Acolhida',
    Especialista: 'Casos em Acompanhamento PAEFI',
  }

  const title = titlesByRole[user.cargo] ?? 'Meus Casos'

  // Descrições dinâmicas
  const descriptionText = {
    Gerente: 'Visualize todos os casos que aguardam distribuição para o PAEFI.',
    'Agente Social': 'Visualize todos os seus casos em acolhida ou aguardando acolhida.',
    Especialista: 'Visualize todos os seus casos em acompanhamento PAEFI.',
  }

  const description =
    descriptionText[user.cargo] ??
    'Visualize os seus casos ativos.'

  return (
    <CaseTable
      title={title}
      description={description}
      endpoint="/cases"
    />
  )
}
