// frontend/src/pages/Cases.tsx
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, LayoutList, Kanban as KanbanIcon } from 'lucide-react'
import { CaseTable } from '@/components/CaseTable'
import { CaseKanban } from '@/components/CaseKanban'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Define o tipo de visualização
type ViewMode = 'table' | 'kanban'

export function Cases() {
  const { user, isSessionLoading } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Buscamos os dados aqui apenas para o Kanban (a Tabela faz sua própria busca paginada)
  const { data: allCases, isLoading: isLoadingKanban } = useQuery({
    queryKey: ['cases', 'kanban-all'],
    queryFn: async () => {
      // [CORREÇÃO]: Adicionado view: 'all' para trazer TODOS os casos ativos
      // pageSize: 100 limita para não travar o navegador, mas traz um panorama amplo
      const res = await api.get('/cases', { params: { pageSize: 100, view: 'all' } })
      return res.data.items
    },
    enabled: viewMode === 'kanban', // Só busca se estiver no modo Kanban
    staleTime: 1000 * 60 // Cache de 1 minuto
  })

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

  const titlesByRole: Record<string, string> = {
    Gerente: 'Gestão de Casos',
    'Agente_Social': 'Acolhida e Triagem',
    Especialista: 'Meus Acompanhamentos',
  }

  const title = titlesByRole[user.cargo] ?? 'Casos Ativos'
  const description = 'Visualize e gerencie o fluxo de atendimentos.'

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header com Alternador de Visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        
        <div className="flex items-center bg-muted p-1 rounded-lg">
          <Button 
            variant={viewMode === 'table' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8"
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="h-4 w-4 mr-2" /> Lista
          </Button>
          <Button 
            variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8"
            onClick={() => setViewMode('kanban')}
          >
            <KanbanIcon className="h-4 w-4 mr-2" /> Quadro
          </Button>
        </div>
      </div>

      {/* Conteúdo Condicional */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <CaseTable
            title="" // Título já exibido acima
            description=""
            endpoint="/cases"
          />
        ) : (
          <CaseKanban 
            cases={allCases || []} 
            isLoading={isLoadingKanban} 
          />
        )}
      </div>
    </div>
  )
}