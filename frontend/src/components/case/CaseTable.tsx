import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Edit, FileDown, Loader2, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { type CaseSummary } from '@/types/case'
import { ROUTES } from '@/constants/routes'
import { formatCPF, formatDateSafe } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { getUrgencyColor } from '@/constants/caseConstants'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/common/Pagination'
import { CaseStatusBadge } from '@/components/case/CaseStatusBadge'
import { ImportCasesModal } from '@/components/modals/ImportCasesModal'

// [CORREÇÃO] Adicionado 'endereco'
interface ExtendedCaseSummary extends CaseSummary { 
  urgencia: string
  violacao?: string
  sexo?: string
  endereco?: string 
}

interface PaginatedCasesResponse { 
  items: ExtendedCaseSummary[]; 
  total: number; 
  page: number; 
  pageSize: number; 
  totalPages: number 
}

interface CaseTableProps { 
  endpoint: '/cases' | '/cases/closed'; 
  title: string; 
  description: string;
  defaultView?: 'my' | 'all';
  extraParams?: Record<string, string | undefined>;
  filters?: any;
}

type SortDirection = 'asc' | 'desc'
interface SortingState {
  field: string
  order: SortDirection
}

function TableRowSkeleton({ isManager }: { isManager: boolean }) {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      {isManager && <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>}
      {isManager && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
    </TableRow>
  )
}

export function CaseTable({ endpoint, title, description, defaultView = 'my', extraParams = {}, filters = {} }: CaseTableProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page') ?? '1')
  
  const [isExporting, setIsExporting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState | null>(null)

  const toggleSort = (field: string) => {
    setSorting(current => {
      if (current?.field === field) {
        if (current.order === 'asc') return { field, order: 'desc' }
        return null 
      }
      return { field, order: 'asc' }
    })
  }

  const { data: result, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ['cases', endpoint, currentPage, filters, sorting, defaultView, extraParams],
    queryFn: async () => {
      const params = {
        page: currentPage, 
        pageSize: 10,
        view: defaultView,
        sortBy: sorting?.field,
        sortOrder: sorting?.order,
        ...extraParams,
        ...filters 
      }
      
      const response = await api.get(endpoint, { params })
      
      const data = response.data.data || response.data.items || []
      const meta = response.data.meta || { 
        total: response.data.total || 0,
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 10,
        totalPages: response.data.totalPages || 1
      }

      return {
        items: data,
        total: meta.total,
        page: meta.page,
        pageSize: meta.pageSize,
        totalPages: meta.totalPages
      }
    },
    // [CORREÇÃO] Em React Query v5 'keepPreviousData' virou 'placeholderData'
    // Mas se for v4, isso aqui funciona. O erro no GlobalAudit indica que você pode estar usando uma versão onde isso mudou ou a tipagem está estrita.
    // Vamos manter simples: se der erro de tipo, remova o keepPreviousData se não for essencial ou use o placeholderData.
    // Para v4: keepPreviousData: true
  })

  const handlePageChange = (page: number) => setSearchParams(prev => { prev.set('page', String(page)); return prev })

  const handleExport = async () => {
    setIsExporting(true)
    const exportPromise = api.get('/cases/export', { responseType: 'blob' })
    toast.promise(exportPromise, {
      loading: 'Gerando exportação...',
      success: (res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a'); link.href = url; link.download = `export_cases_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); link.remove(); return 'Concluído!'
      },
      error: 'Erro ao exportar.', finally: () => setIsExporting(false)
    })
  }

  const SortableHeader = ({ label, field, className }: { label: string, field: string, className?: string }) => {
    const isActive = sorting?.field === field
    return (
      <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors select-none ${className}`} onClick={() => toggleSort(field)}>
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sorting.order === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </TableHead>
    )
  }

  const isManagerEndpoint = endpoint === '/cases'

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="text-muted-foreground">{description}</p></div>
        {isManagerEndpoint && user?.cargo === 'Gerente' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Importar CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} Exportar CSV</Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden rounded-md border bg-card">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader>
              <TableRow className="group">
                <SortableHeader label="Nome" field="nomeCompleto" className="whitespace-nowrap" />
                <SortableHeader label="Sexo" field="sexo" className="whitespace-nowrap" />
                <TableHead className="whitespace-nowrap">CPF</TableHead>
                
                {isManagerEndpoint && <SortableHeader label="Urgência" field="urgencia" className="whitespace-nowrap" />}
                {isManagerEndpoint && <TableHead className="whitespace-nowrap">Violação</TableHead>}

                <SortableHeader 
                  label={endpoint === '/cases/closed' ? 'Desligamento' : 'Entrada'} 
                  field={endpoint === '/cases/closed' ? 'dataDesligamento' : 'dataEntrada'} 
                  className="whitespace-nowrap" 
                />
                
                {endpoint === '/cases/closed' && <TableHead className="whitespace-nowrap">Motivo</TableHead>}
                
                <TableHead className="whitespace-nowrap">Responsável</TableHead>
                <SortableHeader label="Status" field="status" className="whitespace-nowrap" />
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRowSkeleton key={i} isManager={isManagerEndpoint} />
              ))}
              
              {!isLoading && result?.items.length === 0 && <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground">Nenhum caso encontrado.</TableCell></TableRow>}
              
              {result?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link to={ROUTES.CASE_DETAIL(item.id)} className="hover:underline hover:text-primary transition-colors block flex flex-col" title={item.nomeCompleto}>
                      <span>{item.nomeCompleto}</span>
                      {/* [CORREÇÃO] Endereço agora é reconhecido */}
                      {item.endereco && <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[150px]">{item.endereco}</span>}
                    </Link>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{item.sexo || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatCPF(item.cpf)}</TableCell>
                  
                  {isManagerEndpoint && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className={`${getUrgencyColor(item.urgencia)} border px-2 py-0.5 text-[10px] uppercase block text-center w-fit`} title={item.urgencia}>
                        {item.urgencia}
                      </Badge>
                    </TableCell>
                  )}

                  {isManagerEndpoint && (
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.violacao || '-'}
                    </TableCell>
                  )}

                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {endpoint === '/cases/closed' 
                      ? formatDateSafe(item.dataDesligamento) 
                      : formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })
                    }
                  </TableCell>

                  {endpoint === '/cases/closed' && (
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.motivoDesligamento ?? '-'}
                    </TableCell>
                  )}

                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {item.status === 'EM_ACOMPANHAMENTO' || (endpoint === '/cases/closed' && item.especialistaPAEFI) 
                      ? item.especialistaPAEFI?.nome?.split(' ')[0] ?? 'N/A' 
                      : item.agenteAcolhida?.nome?.split(' ')[0] ?? 'N/A'
                    }
                  </TableCell>
                  
                  <TableCell className="whitespace-nowrap">
                    <CaseStatusBadge status={item.status} />
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="p-0">
                          <Link to={ROUTES.CASE_DETAIL(item.id)} className="flex w-full items-center px-2 py-1.5 cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" /> Ver Detalhes
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {result && result.total > 0 && <Pagination currentPage={currentPage} totalPages={result.totalPages} totalItems={result.total} pageSize={result.pageSize} onPageChange={handlePageChange} />}
      <ImportCasesModal isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}