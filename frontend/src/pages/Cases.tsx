// frontend/src/pages/Cases.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, LayoutList, Kanban as KanbanIcon, Users, User } from 'lucide-react'
import { CaseTable } from '@/components/CaseTable'
import { CaseKanban } from '@/components/CaseKanban'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ViewMode = 'table' | 'kanban'
type FilterView = 'my' | 'all'

export function Cases() {
  const { user, isSessionLoading } = useAuth()
  
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filterView, setFilterView] = useState<FilterView>('my')

  // [NOVO] Efeito para alternar o filtro padrão baseado no modo de visualização
  useEffect(() => {
    if (viewMode === 'kanban') {
      setFilterView('all')
    } else {
      setFilterView('my')
    }
  }, [viewMode])

  // Query para o Kanban
  const { data: kanbanCases, isLoading: isLoadingKanban } = useQuery({
    queryKey: ['cases', 'kanban', filterView],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { pageSize: 100, view: filterView } 
      })
      return res.data.items
    },
    enabled: viewMode === 'kanban', 
    staleTime: 1000 * 60
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

  const getTitle = () => {
    if (filterView === 'all') return 'Todos os Casos Ativos'
    
    const roleTitles: Record<string, string> = {
      Gerente: 'Meus Casos (Gerência)',
      'Agente_Social': 'Minhas Acolhidas',
      Especialista: 'Meus Acompanhamentos',
    }
    return roleTitles[user.cargo] ?? 'Meus Casos'
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{getTitle()}</h2>
          <p className="text-muted-foreground">
            {filterView === 'all' 
              ? 'Visualizando fluxo completo da unidade.' 
              : 'Visualizando apenas casos sob sua responsabilidade.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Seletor de Escopo */}
          <Tabs value={filterView} onValueChange={(v) => setFilterView(v as FilterView)} className="w-full sm:w-[240px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my" className="gap-2">
                <User className="h-3.5 w-3.5" /> Meus
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-3.5 w-3.5" /> Todos
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <CaseTable
            title="" 
            description=""
            endpoint="/cases"
            defaultView={filterView}
          />
        ) : (
          <CaseKanban 
            cases={kanbanCases || []} 
            isLoading={isLoadingKanban} 
          />
        )}
      </div>
    </div>
  )
}