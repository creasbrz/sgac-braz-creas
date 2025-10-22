// frontend/src/pages/Cases.tsx
import { CaseTable } from '@/components/CaseTable'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function Cases() {
  const { user, isSessionLoading } = useAuth()

  // Feedback de carregamento para evitar "piscar" da interface
  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Define descrições personalizadas com base no cargo
  const descriptionText = {
    Gerente: 'Visualize todos os casos que aguardam distribuição para o PAEFI.',
    'Agente Social': 'Visualize todos os seus casos em acolhida ou aguardando acolhida.',
    Especialista: 'Visualize todos os seus casos em acompanhamento PAEFI.'
  }

  // Garante que user não é nulo antes de aceder a cargo
  const description = user ? (descriptionText[user.cargo] || 'Visualize os seus casos ativos.') : 'A carregar...'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Casos Ativos</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Passa o 'scope' para a tabela saber que dados buscar */}
        <CaseTable scope="active" />
      </CardContent>
    </Card>
  )
}