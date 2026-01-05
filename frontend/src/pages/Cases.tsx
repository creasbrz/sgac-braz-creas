import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, LayoutList, Kanban as KanbanIcon, Users, User, FilterX } from 'lucide-react'
import { CaseTable } from '@/components/case/CaseTable'
import { CaseKanban } from '@/components/case/CaseKanban'
import { CaseFilters } from '@/components/case/CaseFilters'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ViewMode = 'table' | 'kanban'
type FilterView = 'my' | 'all'

export function Cases() {
  const { user, isSessionLoading } = useAuth()
  
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filterView, setFilterView] = useState<FilterView>('my')

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    urgencia: ''
  })

  // [CORREÇÃO] Lógica de Visualização Padrão solicitada
  useEffect(() => {
    if (viewMode === 'kanban') {
      setFilterView('all') // Kanban vê o todo
    } else {
      setFilterView('my')  // Tabela vê o individual
    }
  }, [viewMode])

  // Query para o Kanban
  const { data: kanbanCases, isLoading: isLoadingKanban } = useQuery({
    queryKey: ['cases', 'kanban', filterView, filters],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { 
          pageSize: 100, 
          view: filterView,
          ...filters 
        } 
      })
      return res.data.data || res.data.items || [] 
    },
    enabled: viewMode === 'kanban', 
    staleTime: 1000 * 60
  })

  if (isSessionLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  const getTitle = () => {
    if (filterView === 'all') return 'Visão Geral da Unidade'
    
    const roleTitles: Record<string, string> = {
      Gerente: 'Distribuição e Pendências',
      'Agente_Social': 'Minha Caixa de Acolhida',
      Especialista: 'Meus Acompanhamentos (PAEFI)',
    }
    return roleTitles[user?.cargo || ''] ?? 'Meus Casos'
  }

  const clearFilters = () => setFilters({ search: '', status: '', urgencia: '' })
  const hasActiveFilters = filters.search || filters.status || filters.urgencia

  return (
    <div className="space-y-6 h-full flex flex-col p-2 sm:p-0 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{getTitle()}</h2>
          <p className="text-muted-foreground">
            {filterView === 'all' 
              ? 'Visualizando fluxo completo da unidade.' 
              : 'Focando apenas nos casos sob sua responsabilidade direta.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Seletor de Escopo (Manual) */}
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

          {/* Alternador de Visualização */}
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

      {/* Barra de Filtros */}
      <div className="bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 border-b flex items-center gap-2">
        <div className="flex-1">
          <CaseFilters filters={filters} setFilters={setFilters} />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive">
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden min-h-[400px]">
        {viewMode === 'table' ? (
          <CaseTable
            title="" 
            description=""
            endpoint="/cases"
            defaultView={filterView}
            filters={filters} 
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