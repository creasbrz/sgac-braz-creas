// frontend/src/components/case/CaseTable.tsx
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
import { useAuth } from '@/contexts/AuthContext'
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

// [CORREÇÃO 1] Helper para formatar o endereço (String ou Objeto)
const formatCaseAddress = (endereco: string | AddressData | null | undefined) => {
  if (!endereco) return null

  // Se for string antiga/legado
  if (typeof endereco === 'string') return endereco

  // Se for objeto estruturado (conforme CaseForm)
  const parts = [
    endereco.logradouro,
    endereco.complemento,
    endereco.bairro,
    endereco.ra // Região Administrativa é importante
  ].filter(part => part && part.trim() !== '')

  if (parts.length === 0) return null
  
  // Ex: "QNM 10 Conjunto A, Ceilândia"
  return parts.join(', ')
}

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

// [CORREÇÃO 2] Interface para o Objeto de Endereço
interface AddressData {
  logradouro?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  ra?: string
}

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
  // [CORREÇÃO 3] Aceita string ou objeto AddressData
  endereco?: string | AddressData | null 
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
  title?: string
  description?: string
  defaultView?: 'my' | 'all'
  queryParams?: Record<string, string | undefined>
  className?: string
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
    <div className="flex flex-wrap justify-start items-center gap-1.5">
      {displayItems.map((v, i) => (
        <Badge 
          key={i} 
          variant="outline" 
          className="max-w-30 truncate border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground hover:bg-muted"
          title={v}
        >
          {v}
        </Badge>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] font-bold text-muted-foreground/80 bg-muted/30 px-1.5 rounded-sm" title={list.slice(2).join(', ')}>
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
        isActive && "text-foreground font-semibold bg-muted/20",
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
  <div className="flex min-h-100 flex-col items-center justify-center space-y-3 rounded-md bg-muted/5 p-8 text-center animate-in fade-in zoom-in-95 duration-300 border-2 border-dashed border-border/50">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted shadow-sm">
      <SearchX className="h-6 w-6 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">Nenhum caso encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Não conseguimos encontrar registros com os filtros atuais.
      </p>
    </div>
    <Button variant="outline" size="sm" onClick={onClear} className="mt-4 shadow-sm">
      Limpar filtros
    </Button>
  </div>
)

const TableRowSkeleton = ({ isManager }: { isManager: boolean }) => (
  <TableRow>
    <TableCell><Skeleton className="h-5 w-40 mb-1" /><Skeleton className="h-3 w-24 opacity-60" /></TableCell>
    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
    {isManager && <TableCell><div className="mx-auto h-5 w-20 rounded-full bg-muted/50" /></TableCell>}
    {isManager && <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-12" /></div></TableCell>}
    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><div className="mx-auto h-6 w-24 rounded-full bg-muted/50" /></TableCell>
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
  
  const [isExporting, setIsExporting] = useState(false)
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

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const response = await api.get('/cases/export', {
        responseType: 'blob', 
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      const formattedDate = format(new Date(), 'yyyy-MM-dd')
      link.href = url
      link.setAttribute('download', `Exportacao_Casos_${formattedDate}.xlsx`)
      document.body.appendChild(link)
      link.click()
      
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar:', error)
    } finally {
      setIsExporting(false)
    }
  }

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
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="h-9 gap-2 shadow-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> 
                <span className="hidden sm:inline">Importar</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                disabled={isExporting} 
                className="h-9 gap-2 shadow-sm"
              >
                <FileDown className={cn("h-4 w-4 text-blue-600", isExporting && "animate-bounce")} /> 
                <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <DataTableFilters filters={activeFilters} setFilters={handleFilterChange} onClear={clearFilters} />
        <div className="mt-2 flex justify-end xl:mt-0">
          <SavedFilters currentFilters={activeFilters} onApply={applySavedFilter} />
        </div>
      </div>

      <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto relative">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <TableRow className="hover:bg-transparent border-b-border/60">
                <SortableColumn label="Nome / Endereço" field="nomeCompleto" sorting={sorting} onToggle={toggleSort} className="pl-6 min-w-55" />
                <SortableColumn label="Sexo" field="sexo" sorting={sorting} onToggle={toggleSort} align="center" className="w-20" />
                <TableHead className="w-35 whitespace-nowrap text-muted-foreground font-medium">CPF</TableHead>
                
                {!isArchiveMode && (
                  <>
                    <SortableColumn label="Urgência" field="urgencia" sorting={sorting} onToggle={toggleSort} align="center" className="w-35" />
                    <TableHead className="w-55 whitespace-nowrap text-muted-foreground font-medium">Violação</TableHead>
                  </>
                )}

                <SortableColumn 
                  label={isArchiveMode ? 'Desligamento' : 'Tempo'} 
                  field={isArchiveMode ? 'dataDesligamento' : 'dataEntrada'} 
                  sorting={sorting} 
                  onToggle={toggleSort}
                  align="right"
                  className="w-35 pr-6" 
                />
                
                {isArchiveMode && <TableHead className="whitespace-nowrap w-37.5 text-muted-foreground font-medium">Motivo</TableHead>}
                <TableHead className="whitespace-nowrap w-40 text-muted-foreground font-medium">Responsável</TableHead>
                
                {!isArchiveMode && (
                   <SortableColumn label="Status" field="status" sorting={sorting} onToggle={toggleSort} align="center" className="w-40" />
                )}
                
                <TableHead className="w-12.5"></TableHead>
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
                result?.items.map((item) => {
                  // [CORREÇÃO 4] Processa o endereço antes de renderizar
                  const formattedAddress = formatCaseAddress(item.endereco)

                  return (
                    <TableRow key={item.id} className="group transition-colors hover:bg-muted/30 border-b-border/40">
                      <TableCell className="py-3 pl-6 align-top">
                        <div className="flex flex-col gap-0.5">
                          <Link 
                            to={ROUTES.CASE_DETAIL(item.id)} 
                            className="font-semibold text-foreground transition-colors hover:text-primary hover:underline underline-offset-4 line-clamp-1"
                            title={item.nomeCompleto}
                          >
                            {item.nomeCompleto}
                          </Link>
                          
                          {/* [CORREÇÃO 5] Renderiza a string formatada */}
                          {formattedAddress ? (
                            <span className="truncate text-xs text-muted-foreground/80 max-w-62.5" title={formattedAddress}>
                              {formattedAddress}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground/40">Sem endereço</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-xs text-muted-foreground text-center align-top pt-3.5 font-medium">
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
                                "whitespace-nowrap w-fit mx-auto border px-2.5 py-0.5 text-[10px] font-bold uppercase shadow-none bg-opacity-10",
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
                            <span title={format(new Date(item.dataEntrada), "dd 'de' MMMM, HH:mm", { locale: ptBR })} className="font-medium">
                              {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}
                            </span>
                          )
                        }
                      </TableCell>

                      {isArchiveMode && (
                        <TableCell className="align-top pt-3.5">
                          <div className="truncate text-xs text-muted-foreground max-w-35" title={item.motivoDesligamento}>
                            {item.motivoDesligamento ?? '-'}
                          </div>
                        </TableCell>
                      )}

                      <TableCell className="text-xs font-medium text-foreground/80 align-top pt-3.5">
                        {item.status === 'EM_ACOMPANHAMENTO' || (isArchiveMode && item.especialistaPAEFI) 
                          ? item.especialistaPAEFI?.nome?.split(' ')[0] ?? <span className="text-muted-foreground/40 italic">-</span>
                          : item.agenteAcolhida?.nome?.split(' ')[0] ?? <span className="text-muted-foreground/40 italic">-</span>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={ROUTES.CASE_DETAIL(item.id)} className="cursor-pointer font-medium">
                                <Edit className="mr-2 h-4 w-4 text-primary" /> Ver Detalhes
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {result && result.total > 0 && (
        <div className="border-t border-border/40 pt-4">
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