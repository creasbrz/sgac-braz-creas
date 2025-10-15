// frontend/src/pages/Dashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

interface Stats {
  totalCases: number
  acolhidasCount: number
  acompanhamentosCount: number
}

// Componente reutilizável para os cartões de estatísticas
interface StatCardProps {
  title: string
  description: string
  value?: number
}

function StatCard({ title, description, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{value ?? '-'}</p>
      </CardContent>
    </Card>
  )
}

// Componente de esqueleto para o StatCard
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-1/4" />
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  // Adiciona refetch para o botão "Tentar novamente"
  const { data: stats, isLoading, isError, refetch } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/stats')
      return response.data
    },
    enabled: user?.cargo === 'Gerente',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo, {user?.nome}!</h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da atividade recente no sistema.
        </p>
      </div>

      {user?.cargo === 'Gerente' && (
        <>
          {isError ? (
            // Feedback de erro melhorado com um Card e botão de ação
            <Card className="border-destructive/50 bg-destructive/10 text-destructive">
              <CardHeader>
                <CardTitle>Erro ao Carregar Dados</CardTitle>
                <CardDescription className="text-destructive/80">
                  Não foi possível buscar as estatísticas do painel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => refetch()}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Total de Casos"
                  description="Número total de casos no sistema."
                  value={stats?.totalCases}
                />
                <StatCard
                  title="Acolhidas Ativas"
                  description="Casos atualmente em acolhida."
                  value={stats?.acolhidasCount}
                />
                <StatCard
                  title="Acompanhamentos Ativos"
                  description="Casos atualmente em PAEFI."
                  value={stats?.acompanhamentosCount}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                Atualizado em: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Fallback para outros cargos */}
      {user?.cargo !== 'Gerente' && (
        <Card>
          <CardHeader>
            <CardTitle>Seus Casos</CardTitle>
            <CardDescription>
              Consulte os casos atribuídos a você no menu lateral, na secção
              "Casos".
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

