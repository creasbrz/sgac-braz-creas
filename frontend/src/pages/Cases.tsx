// frontend/src/pages/Cases.tsx
import { CaseTable } from '@/components/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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

  const canCreateCase = user?.cargo === 'Gerente'

  return (
    <div className="space-y-6">
      {/* A página de Casos agora foca-se apenas em exibir a tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Casos</CardTitle>
          <CardDescription>
            {canCreateCase
              ? 'Visualize, gira e adicione novos casos através do botão no menu lateral.'
              : 'Visualize todos os casos que lhe foram atribuídos.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaseTable />
        </CardContent>
      </Card>
    </div>
  )
}