// frontend/src/pages/Cases.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Loader2, LayoutList, Kanban as KanbanIcon, Users, User, FilterX, Info, FolderKanban
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

import { CaseTable } from '@/components/case/CaseTable'
import { CaseKanban } from '@/components/case/CaseKanban'
import { CaseFilters } from '@/components/case/CaseFilters'
import { Button } from '@/components/ui/button'
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

  // Kanban sempre mostra "todos" para ter contexto do fluxo
  useEffect(() => {
    if (viewMode === 'kanban') {
      setFilterView('all')
    } else {
      // Volta para "meus" ao sair do kanban, se preferir
      setFilterView('my') 
    }
  }, [viewMode])

  // Query específica para o Kanban (traz mais itens de uma vez)
  const { data: kanbanCases, isLoading: isLoadingKanban } = useQuery({
    queryKey: ['cases', 'kanban', filterView, filters],
    queryFn: async () => {
      const res = await api.get('/cases', { 
        params: { 
          pageSize: 100, // Kanban precisa de mais itens para ser útil
          view: filterView,
          ...filters 
        } 
      })
      // Tratamento robusto para diferentes formatos de resposta
      return res.data.data || res.data.items || [] 
    },
    enabled: viewMode === 'kanban', 
    staleTime: 1000 * 60 
  })

  if (isSessionLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Título Dinâmico Baseado no Contexto
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
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER FIXO */}
      <div className="flex flex-col gap-6 p-6 pb-2 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
                 <FolderKanban className="h-6 w-6 text-primary" />
               </div>
               {getTitle()}
               {hasActiveFilters && (
                 <Badge variant="secondary" className="ml-2 h-6 px-2.5 text-xs font-medium bg-muted text-muted-foreground border-border/50">
                   {activeFilterCount} filtro(s)
                 </Badge>
               )}
            </h2>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed ml-1.5 pl-12 -mt-1">
              {viewMode === 'kanban' 
                ? 'Visualização gerencial do fluxo completo de casos por etapa.' 
                : filterView === 'my' 
                  ? 'Focando apenas nos casos sob sua responsabilidade direta.' 
                  : 'Listagem completa de todos os casos ativos na unidade.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/30 p-1.5 rounded-xl border border-border/50 shadow-sm self-start md:self-auto w-full md:w-auto">
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className={viewMode === 'kanban' ? 'cursor-not-allowed opacity-60 grayscale' : ''}>
                    <Tabs value={filterView} onValueChange={(v) => setFilterView(v as FilterView)} className="w-full sm:w-55">
                      <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/60">
                        <TabsTrigger value="my" disabled={viewMode === 'kanban'} className="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <User className="h-3.5 w-3.5" /> Meus
                        </TabsTrigger>
                        <TabsTrigger value="all" className="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <Users className="h-3.5 w-3.5" /> Todos
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </TooltipTrigger>
                {viewMode === 'kanban' && (
                  <TooltipContent side="bottom" className="text-xs">
                    <p>O modo Kanban sempre exibe o fluxo completo (Todos).</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <div className="w-px h-6 bg-border/60 hidden sm:block"></div>

            <div className="flex items-center bg-muted/60 p-1 rounded-lg h-9 w-full sm:w-auto justify-center">
              <Button 
                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-7 px-3 text-xs flex-1 sm:flex-initial transition-all ${viewMode === 'table' ? 'shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-3.5 w-3.5 mr-2" /> Lista
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                size="sm" 
                className={`h-7 px-3 text-xs flex-1 sm:flex-initial transition-all ${viewMode === 'kanban' ? 'shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setViewMode('kanban')}
              >
                <KanbanIcon className="h-3.5 w-3.5 mr-2" /> Quadro
              </Button>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 min-w-0">
            <CaseFilters filters={filters} setFilters={setFilters} />
          </div>
          
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-10 px-4 shrink-0"
            >
              <FilterX className="h-4 w-4 mr-2" /> 
              <span className="hidden sm:inline">Limpar Filtros</span>
            </Button>
          )}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
      <div className="flex-1 overflow-hidden relative border-t border-border/40 bg-muted/5">
        {viewMode === 'table' ? (
          <div className="h-full p-6 pt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
             <CaseTable
               title="" 
               description=""
               endpoint="/cases"
               defaultView={filterView}
               queryParams={{ 
                 view: filterView,
                 ...filters 
               }}
             />
          </div>
        ) : (
          <div className="h-full overflow-x-auto overflow-y-hidden p-6 pt-4 bg-dots-pattern">
            {kanbanCases?.length === 100 && (
              <div className="absolute top-2 right-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium rounded-full border border-amber-200 dark:border-amber-800 shadow-sm animate-in slide-in-from-top-2">
                <Info className="h-3.5 w-3.5" /> Exibindo apenas os 100 casos mais recentes
              </div>
            )}
            <CaseKanban 
              cases={kanbanCases || []} 
              isLoading={isLoadingKanban} 
            />
          </div>
        )}
      </div>
    </div>
  )
}