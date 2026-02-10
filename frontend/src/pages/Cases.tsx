// frontend/src/pages/Cases.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Loader2, LayoutList, Kanban as KanbanIcon, Users, User, FilterX, Info, FolderKanban,
  FileSpreadsheet, FileDown
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

import { CaseTable } from '@/components/case/CaseTable'
import { CaseKanban } from '@/components/case/CaseKanban'
import { CaseFilters } from '@/components/case/CaseFilters'
import { ImportCasesModal } from '@/components/modals/ImportCasesModal'
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
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExport = async () => {
    if (isExporting) return

    setIsExporting(true)
    const promise = api.get('/cases/export', { responseType: 'blob' })

    toast.promise(promise, {
      loading: 'Gerando relatório Excel...',
      success: (response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Relatorio_Casos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        setIsExporting(false)
        return 'Relatório exportado com sucesso!'
      },
      error: (err) => {
        setIsExporting(false)
        console.error(err)
        return 'Falha ao exportar relatório.'
      }
    })
  }

  if (isSessionLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getTitle = () => {
    if (filterView === 'all' && viewMode === 'kanban') return 'Fluxo da Unidade (Kanban)'
    if (filterView === 'all') return 'Visão Geral da Unidade'
    
    // Cast para string para evitar erro de indexação se o cargo não estiver na lista
    const cargo = user?.cargo as string || ''
    const roleTitles: Record<string, string> = {
      'Gerente': 'Distribuição e Pendências',
      'Agente_Social': 'Minha Caixa de Acolhida',
      'Especialista': 'Meus Casos Ativos',
      'Auditor': 'Auditoria de Casos'
    }
    return roleTitles[cargo] ?? 'Meus Casos'
  }

  const clearFilters = () => setFilters({ search: '', status: '', urgencia: '' })
  
  const activeFilterCount = [filters.search, filters.status, filters.urgencia].filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0
  
  // CORREÇÃO TYPESCRIPT: Cast para string para permitir comparação ampla e inclusão de 'Auditor'
  const userRole = user?.cargo as string | undefined
  const isManager = ['Gerente', 'Admin', 'Auditor'].includes(userRole || '')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden animate-in fade-in duration-500 bg-background">
      
      {/* HEADER FIXO */}
      <div className="flex flex-col gap-6 p-6 pb-2 shrink-0 border-b border-transparent bg-background/95 backdrop-blur z-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0 shadow-sm">
                 <FolderKanban className="h-6 w-6 text-primary" />
               </div>
               <span className="truncate">{getTitle()}</span>
               {hasActiveFilters && (
                 <Badge variant="secondary" className="ml-2 h-6 px-2.5 text-xs font-medium bg-muted text-muted-foreground border-border/50 shrink-0">
                   {activeFilterCount} filtro(s)
                 </Badge>
               )}
            </h2>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed ml-1.5 pl-12 -mt-1 hidden sm:block">
              {viewMode === 'kanban' 
                ? 'Visualização gerencial do fluxo completo de casos por etapa.' 
                : filterView === 'my' 
                  ? 'Focando apenas nos casos sob sua responsabilidade direta.' 
                  : 'Listagem completa de todos os casos ativos na unidade.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto w-full xl:w-auto">
            
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className={cn("bg-muted/30 p-1 rounded-xl border border-border/50 shadow-sm", viewMode === 'kanban' && "cursor-not-allowed opacity-60 grayscale")}>
                    {/* CORREÇÃO TAILWIND: w-[180px] -> w-45 */}
                    <Tabs value={filterView} onValueChange={(v) => setFilterView(v as FilterView)} className="w-45">
                      <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/60">
                        <TabsTrigger value="my" disabled={viewMode === 'kanban'} className="gap-2 text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <User className="h-3.5 w-3.5" /> Meus
                        </TabsTrigger>
                        <TabsTrigger value="all" className="gap-2 text-xs h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                          <Users className="h-3.5 w-3.5" /> Todos
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </TooltipTrigger>
                {viewMode === 'kanban' && (
                  <TooltipContent side="bottom" className="text-xs">
                    <p>O modo Kanban sempre exibe o fluxo completo.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <div className="w-px h-8 bg-border/60 hidden sm:block mx-1"></div>

            <div className="flex items-center bg-muted/60 p-1 rounded-lg h-10 border border-border/20 shadow-sm">
              <Button 
                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-8 px-3 text-xs transition-all", 
                  viewMode === 'table' ? 'shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'
                )}
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-3.5 w-3.5 mr-2" /> Lista
              </Button>
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-8 px-3 text-xs transition-all", 
                  viewMode === 'kanban' ? 'shadow-sm font-medium' : 'text-muted-foreground hover:bg-background/50'
                )}
                onClick={() => setViewMode('kanban')}
              >
                <KanbanIcon className="h-3.5 w-3.5 mr-2" /> Quadro
              </Button>
            </div>

            {isManager && (
              <>
                <div className="w-px h-8 bg-border/60 hidden sm:block mx-1"></div>
                
                <div className="flex items-center gap-2">
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => setIsImportOpen(true)}
                           className="h-10 px-3 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-50/50 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 transition-colors"
                         >
                           <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-emerald-600 dark:text-emerald-500" /> 
                           <span className="hidden sm:inline">Importar</span>
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>Importar dados via Excel</TooltipContent>
                     </Tooltip>
                   </TooltipProvider>

                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={handleExport}
                           disabled={isExporting}
                           className="h-10 px-3 hover:bg-blue-50/50 hover:text-blue-700 hover:border-blue-500/30 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 transition-colors"
                         >
                           <FileDown className={cn("h-4 w-4 sm:mr-2 text-blue-600 dark:text-blue-500", isExporting && "animate-bounce")} /> 
                           <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>Baixar relatório atual</TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                </div>
              </>
            )}

          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <div className="flex-1 w-full sm:w-auto min-w-0">
            <CaseFilters filters={filters} setFilters={setFilters} />
          </div>
          
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-10 px-4 shrink-0 self-end sm:self-auto"
            >
              <FilterX className="h-4 w-4 mr-2" /> 
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative border-t border-border/40 bg-muted/5">
        {viewMode === 'table' ? (
          <div className="h-full p-6 pt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
             <CaseTable
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

      <ImportCasesModal isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}