// frontend/src/pages/Cases.tsx
import { CaseTable } from '@/components/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function Cases() {
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

  // [CORREÇÃO] Usando chaves exatas do backend (com underline)
  const titlesByRole: Record<string, string> = {
    Gerente: 'Todos os Casos',
    'Agente_Social': 'Minha Caixa de Acolhida',
    Especialista: 'Casos em Acompanhamento PAEFI',
  }

  const title = titlesByRole[user.cargo] ?? 'Casos Ativos'

  const descriptionText: Record<string, string> = {
    Gerente: 'Visão geral de todos os casos ativos na unidade.',
    'Agente_Social': 'Casos aguardando acolhida ou em atendimento inicial sob sua responsabilidade.',
    Especialista: 'Casos vinculados ao seu acompanhamento técnico.',
  }

  const description = descriptionText[user.cargo] ?? 'Listagem de casos do sistema.'

  return (
    <CaseTable
      title={title}
      description={description}
      endpoint="/cases"
    />
  )
}