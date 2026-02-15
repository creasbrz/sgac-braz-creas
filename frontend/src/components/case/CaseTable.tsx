// frontend/src/components/case/CaseTable.tsx
import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  MoreHorizontal, Edit, ArrowUpDown, ArrowUp, ArrowDown, 
  SearchX, AlertCircle, CalendarDays, MapPin, ShieldAlert,
  Bookmark
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

import { api } from '@/lib/api'
import { ROUTES } from '@/constants/app-routes'
import { formatCPF } from '@/utils/formatters'
import { getUrgencyColor } from '@/constants/cases/styles' 

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Pagination } from '@/components/common/Pagination'
import { CaseStatusBadge } from '@/components/case/CaseStatusBadge'
import { DataTableFilters, type FilterState } from '@/components/common/DataTableFilters'
import { SavedFilters } from '@/components/common/SavedFilters'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AddressData {
  logradouro?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string; cep?: string; ra?: string;
}

const formatCaseAddress = (endereco: unknown): string | null => {
  if (!endereco) return null
  if (typeof endereco === 'string') return endereco
  
  const addr = endereco as AddressData
  const mainLoc = [addr.bairro, addr.ra].filter(Boolean).join(' - ')
  const street = addr.logradouro ? `${addr.logradouro}${addr.complemento ? `, ${addr.complemento}` : ''}` : ''
  
  if (mainLoc && street) return `${street} (${mainLoc})`
  return street || mainLoc || null
}

// --- TYPES ---
interface ExtendedCaseSummary { 
  id: string; nomeCompleto: string; cpf: string; status: string; dataEntrada: string;
  dataDesligamento?: string; motivoDesligamento?: string; urgencia: string;
  violacao?: string[] | string | null; sexo?: string;
  endereco?: string | AddressData | null;
  manterReferencia?: boolean; 
  agenteAcolhida?: { nome: string }; especialistaPAEFI?: { nome: string };
}

interface PaginatedCasesResponse { 
  items: ExtendedCaseSummary[]; total: number; page: number; pageSize: number; totalPages: number; 
}

interface CaseTableProps { 
  endpoint: '/cases' | '/cases/closed'
  title?: string
  description?: string
  defaultView?: 'my' | 'all'
  queryParams?: Record<string, string | undefined>
  className?: string
  hideHeader?: boolean
}

type SortDirection = 'asc' | 'desc'
interface SortingState { field: string; order: SortDirection }

const INITIAL_FILTERS: FilterState = {
  status: 'all', urgencia: 'all', violacao: 'all', categoria: 'all', sexo: 'all'
}

// --- SUB-COMPONENTS ---

const ViolationTags = ({ rawViolations }: { rawViolations?: string[] | string | null }) => {
  if (!rawViolations) return <span className="text-muted-foreground/20 text-[10px]">—</span>
  
  const list = useMemo(() => {
    if (Array.isArray(rawViolations)) return rawViolations
    if (typeof rawViolations === 'string' && rawViolations.length > 0) return rawViolations.split(',').map(s => s.trim())
    return []
  }, [rawViolations])

  if (list.length === 0) return <span className="text-muted-foreground/20 text-[10px]">—</span>

  const first = list[0]
  const remaining = list.length - 1

  return (
    <div className="flex items-center gap-1 justify-center">
      <Badge variant="secondary" className="max-w-30 truncate border-transparent bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground hover:bg-muted/80">
        {first}
      </Badge>
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help px-1 py-0 text-[9px] text-muted-foreground hover:bg-muted">
                +{remaining}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground">Outras violações:</span>
                <ul className="list-disc pl-3 text-xs text-muted-foreground">
                  {list.slice(1).map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

const SortableHeader = ({ label, field, sorting, onToggle, align = 'center', className }: any) => {
  const isActive = sorting?.field === field
  return (
    <TableHead 
      className={cn(
        "sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)]",
        "h-10 cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-muted/50",
        isActive && "text-foreground font-semibold bg-muted/20",
        align === 'center' && "text-center", 
        align === 'right' && "text-right", 
        className
      )} 
      onClick={() => onToggle(field)}
    >
      <div className={cn("flex items-center gap-1.5", align === 'center' && "justify-center", align === 'right' && "justify-end flex-row-reverse")}>
        <span>{label}</span>
        {isActive ? (
          sorting?.order === 'asc' ? <ArrowUp className="h-3 w-3 text-primary"/> : <ArrowDown className="h-3 w-3 text-primary"/>
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-20 group-hover:opacity-50"/>
        )}
      </div>
    </TableHead>
  )
}

const TableRowsSkeleton = () => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i} className="h-14">
        <TableCell className="pl-6"><Skeleton className="h-4 w-48" /></TableCell>
        <TableCell><Skeleton className="h-3 w-8 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-3 w-28 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24 mx-auto rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-3 w-20 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-3 w-24 mx-auto" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24 mx-auto rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
      </TableRow>
    ))}
  </>
)

// --- MAIN COMPONENT ---

export function CaseTable({ 
  endpoint, title, description, defaultView = 'my', queryParams = {}, className, hideHeader = false
}: CaseTableProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page') ?? '1')
  
  const [sorting, setSorting] = useState<SortingState | null>(null)
  const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS)

  const toggleSort = (field: string) => {
    setSorting(current => 
      current?.field === field 
        ? (current.order === 'asc' ? { field, order: 'desc' } : null) 
        : { field, order: 'asc' }
    )
  }

  const filtersToUse = hideHeader ? {} : activeFilters

  const { data: result, isLoading, isError, refetch, isPlaceholderData } = useQuery<PaginatedCasesResponse>({
    queryKey: ['cases', endpoint, currentPage, filtersToUse, sorting, defaultView, queryParams],
    queryFn: async () => {
      const cleanInternalFilters = Object.fromEntries(
        Object.entries(filtersToUse).filter(([_, v]) => v !== 'all' && v !== '')
      )
      
      const cleanExternalParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      )

      const params = {
        page: currentPage, 
        pageSize: 15, 
        view: defaultView, 
        sortBy: sorting?.field, 
        sortOrder: sorting?.order,
        ...cleanExternalParams, 
        ...cleanInternalFilters 
      }
      
      const response = await api.get(endpoint, { params })
      const items = response.data.data || response.data.items || []
      const meta = response.data.meta || { total: 0, page: 1, pageSize: 15, totalPages: 1 }
      
      return { items, total: meta.total, page: meta.page, pageSize: meta.pageSize, totalPages: meta.totalPages }
    },
    staleTime: 5000,
    placeholderData: keepPreviousData 
  })

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev })
  }

  const isArchiveMode = endpoint === '/cases/closed'

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/5 p-8 text-center animate-in fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">Erro ao carregar dados</p>
        <Button variant="outline" onClick={() => refetch()} className="h-8 text-xs">Recarregar</Button>
      </div>
    )
  }

  return (
    // [CORREÇÃO] min-h-[400px] -> min-h-100
    <div className={cn("flex h-full flex-col isolate bg-background min-h-100", className)}>
      
      {!hideHeader && (
        <div className="flex-none p-4 pb-2 space-y-4 border-b border-border/40 shrink-0">
          {(title || description) && (
            <div>
              {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DataTableFilters 
              filters={activeFilters} 
              setFilters={(key, val) => {
                setActiveFilters(prev => ({ ...prev, [key]: val }))
                setSearchParams(prev => { prev.set('page', '1'); return prev })
              }} 
              onClear={() => {
                setActiveFilters(INITIAL_FILTERS)
                setSearchParams(prev => { prev.set('page', '1'); return prev })
              }} 
            />
            <SavedFilters currentFilters={activeFilters} onApply={(c) => setActiveFilters(prev => ({...prev, ...c}))} />
          </div>
        </div>
      )}

      {/* [CORREÇÃO] min-h-[300px] -> min-h-75 */}
      <div className="flex-1 overflow-auto min-h-75 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <Table>
            <TableHeader>
              <TableRow className="border-b-0 hover:bg-transparent">
                <SortableHeader label="Beneficiário" field="nomeCompleto" sorting={sorting} onToggle={toggleSort} align="center" className="min-w-70 w-[25%]" />
                
                <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] w-20 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Sexo
                </TableHead>
                
                <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] w-35 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                  CPF
                </TableHead>
                
                {!isArchiveMode ? (
                  <>
                    <SortableHeader label="Urgência" field="urgencia" sorting={sorting} onToggle={toggleSort} align="center" className="w-32.5" />
                    <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] w-45 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Violações
                    </TableHead>
                  </>
                ) : null}

                <SortableHeader 
                  label={isArchiveMode ? 'Desligamento' : 'Entrada'} 
                  field={isArchiveMode ? 'dataDesligamento' : 'dataEntrada'} 
                  sorting={sorting} onToggle={toggleSort} align="center" 
                  className="w-35" 
                />
                
                {isArchiveMode ? (
                  <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] min-w-55 w-[20%] text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Motivo
                  </TableHead>
                ) : null}
                
                <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] w-40 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Técnico Referência
                </TableHead>
                
                {!isArchiveMode ? (
                  <SortableHeader label="Status" field="status" sorting={sorting} onToggle={toggleSort} align="center" className="w-40" />
                ) : null}
                
                <TableHead className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.05)] w-15"></TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton />
              ) : result?.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={isArchiveMode ? 8 : 9} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                      <SearchX className="h-8 w-8" />
                      <p>Nenhum caso encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                result?.items.map((item) => {
                  const formattedAddress = formatCaseAddress(item.endereco)
                  const isManager = !isArchiveMode

                  return (
                    <TableRow key={item.id} className={cn("group text-xs transition-all hover:bg-muted/40 border-border/40", isPlaceholderData && "opacity-50 grayscale")}>
                      
                      <TableCell className="pl-6 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={ROUTES.CASE_DETAIL(item.id)} className="text-sm font-medium text-foreground hover:text-primary hover:underline line-clamp-1">
                              {item.nomeCompleto}
                            </Link>
                            
                            {item.manterReferencia && (
                              <Badge variant="outline" className="bg-purple-50/50 text-purple-700 border-purple-200/60 px-1.5 py-0 text-[9px] shadow-sm flex items-center gap-1 leading-tight">
                                <Bookmark className="h-2.5 w-2.5 fill-current" /> Referenciada
                              </Badge>
                            )}
                          </div>

                          {formattedAddress ? (
                            <div className="flex items-center gap-1 text-muted-foreground" title={formattedAddress}>
                              <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate max-w-62.5 text-[11px]">{formattedAddress}</span>
                            </div>
                          ) : <span className="text-[10px] italic text-muted-foreground/30 ml-4">Sem endereço</span>}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center align-top py-3 text-muted-foreground">{item.sexo || '-'}</TableCell>
                      
                      <TableCell className="text-center align-top py-3 font-mono text-muted-foreground whitespace-nowrap">
                        {item.cpf ? formatCPF(item.cpf) : '-'}
                      </TableCell>
                      
                      {isManager && (
                        <>
                          <TableCell className="text-center align-top py-3">
                            <Badge variant="outline" className={cn("mx-auto border bg-opacity-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none", getUrgencyColor(item.urgencia))}>
                              {item.urgencia}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center align-top py-3">
                            <ViolationTags rawViolations={item.violacao} />
                          </TableCell>
                        </>
                      )}

                      <TableCell className="text-center align-top py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          {isArchiveMode ? (
                            <span className="font-medium text-muted-foreground whitespace-nowrap">
                              {item.dataDesligamento ? format(new Date(item.dataDesligamento), 'dd/MM/yyyy') : '-'}
                            </span>
                          ) : (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium text-foreground cursor-help whitespace-nowrap">
                                      {formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4" />
                                      {format(new Date(item.dataEntrada), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                {format(new Date(item.dataEntrada), 'dd/MM/yy')}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      {isArchiveMode && (
                        <TableCell className="text-center align-top py-3 text-muted-foreground px-4">
                           <span className="line-clamp-2" title={item.motivoDesligamento}>{item.motivoDesligamento || '-'}</span>
                        </TableCell>
                      )}

                      <TableCell className="text-center align-top py-3 font-medium text-muted-foreground whitespace-nowrap">
                        {item.status === 'EM_ACOMPANHAMENTO' || (isArchiveMode && item.especialistaPAEFI) 
                          ? item.especialistaPAEFI?.nome?.split(' ')[0] ?? '-'
                          : item.agenteAcolhida?.nome?.split(' ')[0] ?? '-'
                        }
                      </TableCell>
                      
                      {isManager && (
                        <TableCell className="text-center align-top py-3">
                          <CaseStatusBadge status={item.status} className="scale-90 mx-auto" />
                        </TableCell>
                      )}
                      
                      <TableCell className="align-top py-2 pr-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={ROUTES.CASE_DETAIL(item.id)} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4 text-primary" /> Abrir Prontuário
                              </Link>
                            </DropdownMenuItem>
                            {!isArchiveMode && (
                              <DropdownMenuItem className="text-amber-600 focus:text-amber-700">
                                <ShieldAlert className="mr-2 h-4 w-4" /> Reportar Incidente
                              </DropdownMenuItem>
                            )}
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
      
      <div className="flex-none flex items-center justify-end border-t border-border/40 bg-background p-2 z-10 relative shrink-0">
        {result && result.total > 0 && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={result.totalPages} 
            totalItems={result.total} 
            pageSize={result.pageSize} 
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  )
}