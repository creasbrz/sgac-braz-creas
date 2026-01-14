import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  Loader2, LayoutList, Kanban as KanbanIcon, Users, User, FilterX, Info 
} from 'lucide-react'
import { CaseTable } from '@/components/case/CaseTable'
import { CaseKanban } from '@/components/case/CaseKanban'
import { CaseFilters } from '@/components/case/CaseFilters'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

  useEffect(() => {
    if (viewMode === 'kanban') {
      setFilterView('all')
    } else {
      setFilterView('my') 
    }
  }, [viewMode])

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
    if (filterView === 'all' && viewMode === 'kanban') return 'Fluxo da Unidade (Kanban)'
    if (filterView === 'all') return 'Visão Geral da Unidade'
    
    const roleTitles: Record<string, string> = {
      Gerente: 'Distribuição e Pendências',
      'Agente_Social': 'Minha Caixa de Acolhida',
      Especialista: 'Meus Acompanhamentos (PAEFI)',
    }
    return roleTitles[user?.cargo || ''] ?? 'Meus Casos'
  }

  const clearFilters = () => setFilters({ search: '', status: '', urgencia: '' })
  
  const activeFilterCount = [filters.search, filters.status, filters.urgencia].filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="space-y-6 h-full flex flex-col p-2 sm:p-0 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {getTitle()}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-6 px-2 text-xs font-normal">
                {activeFilterCount} filtro(s)
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg">
            {viewMode === 'kanban' 
              ? 'Visualização gerencial do fluxo completo de casos por etapa.' 
              : filterView === 'my' 
                ? 'Focando apenas nos casos sob sua responsabilidade direta.' 
                : 'Listagem completa de todos os casos da unidade.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/40 p-1.5 rounded-xl border border-border/50 shadow-sm">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={viewMode === 'kanban' ? 'cursor-not-allowed opacity-80' : ''}>
                  <Tabs value={filterView} onValueChange={(v) => setFilterView(v as FilterView)} className="w-[200px]">
                    <TabsList className="grid w-full grid-cols-2 h-9">
                      <TabsTrigger value="my" disabled={viewMode === 'kanban'} className="gap-2 text-xs">
                        <User className="h-3.5 w-3.5" /> Meus
                      </TabsTrigger>
                      <TabsTrigger value="all" className="gap-2 text-xs">
                        <Users className="h-3.5 w-3.5" /> Todos
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </TooltipTrigger>
              {viewMode === 'kanban' && (
                <TooltipContent>
                  <p>O modo Kanban sempre exibe todos os casos.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-6 bg-border hidden sm:block"></div>

          <div className="flex items-center bg-muted p-1 rounded-lg h-9">
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-3.5 w-3.5 mr-2" /> Lista
            </Button>
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
              size="sm" 
              className="h-7 px-3 text-xs"
              onClick={() => setViewMode('kanban')}
            >
              <KanbanIcon className="h-3.5 w-3.5 mr-2" /> Quadro
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-background/80 backdrop-blur-md sticky top-0 z-20 py-3 border-b flex items-center gap-3 transition-all">
        <div className="flex-1">
          <CaseFilters filters={filters} setFilters={setFilters} />
        </div>
        
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters} 
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-9 px-3"
          >
            <FilterX className="h-4 w-4 mr-2" /> 
            <span className="hidden sm:inline">Limpar Filtros</span>
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-h-[400px] relative">
        {viewMode === 'table' ? (
          <CaseTable
            title="" 
            description=""
            endpoint="/cases"
            // [CORRIGIDO] Agora esta prop será aceita pelo componente atualizado
            defaultView={filterView}
            queryParams={{ 
              view: filterView,
              ...filters 
            }}
          />
        ) : (
          <>
            {kanbanCases?.length === 100 && (
              <div className="absolute top-2 right-4 z-10 flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full border border-amber-200 shadow-sm animate-in slide-in-from-top-2">
                <Info className="h-3 w-3" /> Exibindo os 100 primeiros casos
              </div>
            )}
            <CaseKanban 
              cases={kanbanCases || []} 
              isLoading={isLoadingKanban} 
            />
          </>
        )}
      </div>
    </div>
  )
}