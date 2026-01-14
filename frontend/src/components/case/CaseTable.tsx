import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  MoreHorizontal, Edit, FileDown, FileSpreadsheet, 
  ArrowUpDown, ArrowUp, ArrowDown, SearchX, AlertCircle 
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { api } from '@/lib/api'
import { ROUTES } from '@/constants/app-routes'
import { formatCPF } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { getUrgencyColor } from '@/constants/cases/styles' 

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/common/Pagination'
import { CaseStatusBadge } from '@/components/case/CaseStatusBadge'
import { ImportCasesModal } from '@/components/modals/ImportCasesModal'
import { DataTableFilters, type FilterState } from '@/components/common/DataTableFilters'
import { SavedFilters } from '@/components/common/SavedFilters'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

interface ExtendedCaseSummary { 
  id: string
  nomeCompleto: string
  cpf: string
  status: string
  dataEntrada: string
  dataDesligamento?: string
  motivoDesligamento?: string
  urgencia: string
  violacao?: string[] | string | null 
  sexo?: string
  endereco?: string 
  agenteAcolhida?: { nome: string }
  especialistaPAEFI?: { nome: string }
}

interface PaginatedCasesResponse { 
  items: ExtendedCaseSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number 
}

interface CaseTableProps { 
  endpoint: '/cases' | '/cases/closed'
  title?: string // Opcional agora
  description?: string // Opcional agora
  defaultView?: 'my' | 'all'
  queryParams?: Record<string, string | undefined>
  className?: string // [NOVO] Para customização visual pelo pai
}

type SortDirection = 'asc' | 'desc'
interface SortingState {
  field: string
  order: SortDirection
}

const INITIAL_FILTERS: FilterState = {
  status: 'all',
  urgencia: 'all',
  violacao: 'all',
  categoria: 'all',
  sexo: 'all'
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

const ViolationTags = ({ rawViolations }: { rawViolations?: string[] | string | null }) => {
  if (!rawViolations) return <span className="text-muted-foreground/30 text-[10px]">-</span>
  
  const list = Array.isArray(rawViolations) 
    ? rawViolations 
    : (typeof rawViolations === 'string' && rawViolations.length > 0 ? rawViolations.split(',').map(s => s.trim()) : [])

  if (list.length === 0) return <span className="text-muted-foreground/30 text-[10px]">-</span>

  const displayItems = list.slice(0, 2)
  const remaining = list.length - 2

  return (
    <div className="flex flex-wrap justify-start items-center gap-1">
      {displayItems.map((v, i) => (
        <Badge 
          key={i} 
          variant="outline" 
          className="max-w-[120px] truncate border-transparent bg-muted/50 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
          title={v}
        >
          {v}
        </Badge>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground/80 ml-1" title={list.slice(2).join(', ')}>
          +{remaining}
        </span>
      )}
    </div>
  )
}

const SortableColumn = ({ 
  label, 
  field, 
  sorting, 
  onToggle, 
  align = 'left',
  className 
}: { 
  label: string, 
  field: string, 
  sorting: SortingState | null, 
  onToggle: (f: string) => void, 
  align?: 'left' | 'center' | 'right',
  className?: string 
}) => {
  const isActive = sorting?.field === field
  
  return (
    <TableHead 
      className={cn(
        "cursor-pointer select-none transition-colors hover:bg-muted/50 hover:text-foreground h-10", 
        isActive && "text-foreground font-medium",
        align === 'center' && "text-center",
        align === 'right' && "text-right",
        className
      )} 
      onClick={() => onToggle(field)}
    >
      <div className={cn(
        "flex items-center gap-1.5",
        align === 'center' && "justify-center",
        align === 'right' && "justify-end flex-row-reverse"
      )}>
        {label}
        {isActive ? (
          sorting?.order === 'asc' 
            ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> 
            : <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </TableHead>
  )
}

const EmptyState = ({ onClear }: { onClear: () => void }) => (
  <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3 rounded-md bg-muted/5 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <SearchX className="h-6 w-6 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight">Nenhum caso encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Não conseguimos encontrar registros com os filtros atuais.
      </p>
    </div>
    <Button variant="outline" size="sm" onClick={onClear} className="mt-4">
      Limpar filtros
    </Button>
  </div>
)

const TableRowSkeleton = ({ isManager }: { isManager: boolean }) => (
  <TableRow>
    <TableCell><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24 mt-2" /></TableCell>
    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    {isManager && <TableCell><div className="mx-auto h-6 w-24 rounded-full bg-muted/50" /></TableCell>}
    {isManager && <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-16" /></div></TableCell>}
    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><div className="mx-auto h-6 w-20 rounded-full bg-muted/50" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
  </TableRow>
)

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function CaseTable({ 
  endpoint, 
  title, 
  description, 
  defaultView = 'my', 
  queryParams = {},
  className 
}: CaseTableProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page') ?? '1')
  
  const [isExporting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState | null>(null)
  const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS)

  const toggleSort = (field: string) => {
    setSorting(current => {
      if (current?.field === field) {
        return current.order === 'asc' ? { field, order: 'desc' } : null
      }
      return { field, order: 'asc' }
    })
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }))
    setSearchParams(prev => { prev.set('page', '1'); return prev })
  }

  const clearFilters = () => {
    setActiveFilters(INITIAL_FILTERS)
    setSearchParams(prev => { prev.set('page', '1'); return prev })
  }

  const applySavedFilter = (savedConfig: any) => {
    setActiveFilters(prev => ({ ...prev, ...savedConfig }))
    setSearchParams(prev => { prev.set('page', '1'); return prev })
  }

  const { data: result, isLoading, isError, refetch } = useQuery<PaginatedCasesResponse>({
    queryKey: ['cases', endpoint, currentPage, activeFilters, sorting, defaultView, queryParams],
    queryFn: async (): Promise<PaginatedCasesResponse> => {
      const cleanFilters = Object.fromEntries(
        Object.entries(activeFilters).filter(([_, v]) => v !== 'all' && v !== '')
      )

      const params = {
        page: currentPage, 
        pageSize: 10,
        view: defaultView,
        sortBy: sorting?.field,
        sortOrder: sorting?.order,
        ...queryParams,
        ...cleanFilters 
      }
      
      const response = await api.get(endpoint, { params })
      const items = response.data.data || response.data.items || []
      const meta = response.data.meta || { total: 0, page: 1, pageSize: 10, totalPages: 1 }

      return { items, total: meta.total, page: meta.page, pageSize: meta.pageSize, totalPages: meta.totalPages }
    },
    staleTime: 5000,
    placeholderData: keepPreviousData 
  })

  const handlePageChange = (page: number) => setSearchParams(prev => { prev.set('page', String(page)); return prev })

  const handleExport = async () => { console.log('Exporting...') }

  // Lógica de visualização baseada no Endpoint (Ativo vs Arquivo)
  const isArchiveMode = endpoint === '/cases/closed'
  const showImportExport = !isArchiveMode && user?.cargo === 'Gerente'

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive animate-in fade-in">
        <AlertCircle className="h-10 w-10" />
        <div className="space-y-1">
          <p className="font-semibold">Erro ao carregar dados</p>
          <p className="text-sm opacity-80">Ocorreu um problema ao conectar com o servidor.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="border-destructive/30 hover:bg-destructive/10">Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full flex-col space-y-6 animate-in fade-in duration-500", className)}>
      
      {/* Header (Opcional, pois pode vir do pai) */}
      {(title || description || showImportExport) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {(title || description) && (
            <div className="space-y-1">
              {title && <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          
          {showImportExport && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="h-9 gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> 
                <span className="hidden sm:inline">Importar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="h-9 gap-2">
                <FileDown className="h-4 w-4" /> 
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <DataTableFilters filters={activeFilters} setFilters={handleFilterChange} onClear={clearFilters} />
        <div className="mt-2 flex justify-end xl:mt-0">
          <SavedFilters currentFilters={activeFilters} onApply={applySavedFilter} />
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 rounded-md border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b-input">
                <SortableColumn label="Nome / Endereço" field="nomeCompleto" sorting={sorting} onToggle={toggleSort} className="pl-4 min-w-[200px]" />
                <SortableColumn label="Sexo" field="sexo" sorting={sorting} onToggle={toggleSort} align="center" className="w-[80px]" />
                <TableHead className="w-[130px] whitespace-nowrap">CPF</TableHead>
                
                {/* Colunas Dinâmicas baseadas no Modo */}
                {!isArchiveMode && (
                  <>
                    <SortableColumn label="Urgência" field="urgencia" sorting={sorting} onToggle={toggleSort} align="center" className="w-[140px]" />
                    <TableHead className="w-[200px] whitespace-nowrap">Violação</TableHead>
                  </>
                )}

                <SortableColumn 
                  label={isArchiveMode ? 'Desligamento' : 'Tempo'} 
                  field={isArchiveMode ? 'dataDesligamento' : 'dataEntrada'} 
                  sorting={sorting} 
                  onToggle={toggleSort}
                  align="right"
                  className="w-[140px] pr-6" 
                />
                
                {isArchiveMode && <TableHead className="whitespace-nowrap w-[150px]">Motivo</TableHead>}
                
                <TableHead className="whitespace-nowrap w-[150px]">Responsável</TableHead>
                
                {/* Status só faz sentido se não for arquivo morto (que é tudo desligado) */}
                {!isArchiveMode && (
                   <SortableColumn label="Status" field="status" sorting={sorting} onToggle={toggleSort} align="center" className="w-[140px]" />
                )}
                
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} isManager={!isArchiveMode} />)
              ) : result?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isArchiveMode ? 8 : 10} className="h-96 p-0">
                      <EmptyState onClear={clearFilters} />
                  </TableCell>
                </TableRow>
              ) : (
                result?.items.map((item) => (
                  <TableRow key={item.id} className="group transition-colors hover:bg-muted/40">
                    <TableCell className="py-3 pl-4 align-top">
                      <div className="flex flex-col gap-0.5">
                        <Link 
                          to={ROUTES.CASE_DETAIL(item.id)} 
                          className="font-medium text-foreground transition-colors hover:text-primary hover:underline underline-offset-4 line-clamp-1"
                          title={item.nomeCompleto}
                        >
                          {item.nomeCompleto}
                        </Link>
                        {item.endereco ? (
                          <span className="truncate text-xs text-muted-foreground max-w-[250px]" title={item.endereco}>
                             {item.endereco}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/50">Sem endereço</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-xs text-muted-foreground text-center align-top pt-3.5">
                      {item.sexo || '-'}
                    </TableCell>
                    
                    <TableCell className="text-xs font-mono text-muted-foreground tabular-nums align-top pt-3.5">
                      {formatCPF(item.cpf)}
                    </TableCell>
                    
                    {!isArchiveMode && (
                      <>
                        <TableCell className="text-center align-top pt-3">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "whitespace-nowrap w-fit mx-auto border px-2.5 py-0.5 text-[10px] font-semibold uppercase shadow-none",
                              getUrgencyColor(item.urgencia)
                            )}
                          >
                            {item.urgencia}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 align-top pt-3">
                          <ViolationTags rawViolations={item.violacao} />
                        </TableCell>
                      </>
                    )}

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums text-right pr-6 align-top pt-3.5">
                      {isArchiveMode 
                        ? (item.dataDesligamento ? format(new Date(item.dataDesligamento), 'dd/MM/yyyy') : '-')
                        : (
                          <span title={format(new Date(item.dataEntrada), "dd 'de' MMMM, HH:mm", { locale: ptBR })}>
                             {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}
                          </span>
                        )
                      }
                    </TableCell>

                    {isArchiveMode && (
                      <TableCell className="align-top pt-3.5">
                        <div className="max-w-[140px] truncate text-xs text-muted-foreground" title={item.motivoDesligamento}>
                          {item.motivoDesligamento ?? '-'}
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="text-xs font-medium text-foreground/80 align-top pt-3.5">
                      {/* Lógica para mostrar técnico responsável baseado no status */}
                      {item.status === 'EM_ACOMPANHAMENTO' || (isArchiveMode && item.especialistaPAEFI) 
                        ? item.especialistaPAEFI?.nome?.split(' ')[0] ?? '-' 
                        : item.agenteAcolhida?.nome?.split(' ')[0] ?? '-'
                      }
                    </TableCell>
                    
                    {!isArchiveMode && (
                      <TableCell className="text-center align-top pt-2.5">
                        <div className="flex justify-center">
                          <CaseStatusBadge status={item.status} />
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell className="pr-4 text-right align-top pt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={ROUTES.CASE_DETAIL(item.id)} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {result && result.total > 0 && (
        <div className="border-t pt-2">
           <Pagination 
             currentPage={currentPage} 
             totalPages={result.totalPages} 
             totalItems={result.total} 
             pageSize={result.pageSize} 
             onPageChange={handlePageChange} 
           />
        </div>
      )}
      
      <ImportCasesModal isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}