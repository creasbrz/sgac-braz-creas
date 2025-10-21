// frontend/src/pages/ClosedCases.tsx
import { CaseTable } from '@/components/CaseTable'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function ClosedCases() {
  const { user } = useAuth()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Casos Finalizados</CardTitle>
        <CardDescription>
          {user?.cargo === 'Gerente'
            ? 'Consulte todos os casos que já foram desligados do sistema.'
            : 'Consulte todos os seus casos que já foram desligados.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Passa o 'scope' para a tabela buscar apenas casos fechados */}
        <CaseTable scope="closed" />
      </CardContent>
    </Card>
  )
}

