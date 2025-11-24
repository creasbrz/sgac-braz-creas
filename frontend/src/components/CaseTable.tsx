// frontend/src/components/CaseTable.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Search, Edit, FileDown, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { type CaseSummary } from '@/types/case'
import { useDebounce } from '@/hooks/useDebounce'
import { ROUTES } from '@/constants/routes'
import { formatCPF, formatDateSafe } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/error'
// [NOVO] Importa a função de cor
import { getUrgencyColor } from '@/constants/caseConstants'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pagination } from './Pagination'
import { CaseStatusBadge } from './CaseStatusBadge'
import { DataTableFilters } from './DataTableFilters'

interface PaginatedCasesResponse {
  items: CaseSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface CaseTableProps {
  endpoint: '/cases' | '/cases/closed'
  title: string
  description: string
}

export function CaseTable({ endpoint, title, description }: CaseTableProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const initialSearch = searchParams.get('search') ?? ''
  const initialPage = Number(searchParams.get('page') ?? '1')

  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const currentPage = initialPage > 0 ? initialPage : 1
  const [isExporting, setIsExporting] = useState(false)

  const [filters, setFilters] = useState({
    status: '',
    urgencia: '',
    violacao: ''
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }))
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    setSearchParams(params)
  }

  const clearFilters = () => {
    setFilters({ status: '', urgencia: '', violacao: '' })
  }

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaginatedCasesResponse>({
    queryKey: ['cases', endpoint, debouncedSearchTerm, currentPage, filters],
    queryFn: async () => {
      const response = await api.get(endpoint, {
        params: {
          search: debouncedSearchTerm || undefined,
          page: currentPage,
          pageSize: 10,
          status: filters.status || undefined,
          urgencia: filters.urgencia || undefined,
          violacao: filters.violacao || undefined,
        },
      })
      return response.data
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
    enabled: !!endpoint,
  })

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(page))
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm)
    else params.delete('search')
    setSearchParams(params)
  }

  const handleExport = async () => {
    setIsExporting(true)
    const exportPromise = api.get('/cases/export', { responseType: 'blob' })

    toast.promise(exportPromise, {
      loading: 'A gerar ficheiro de exportação...',
      success: (response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        const fileName = `export_casos_${new Date().toISOString().split('T')[0]}.csv`
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        return 'Exportação concluída!'
      },
      error: (error) => getErrorMessage(error, 'Falha ao exportar dados.'),
      finally: () => setIsExporting(false)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {endpoint === '/cases' && user?.cargo === 'Gerente' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Exportar CSV
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 w-full sm:w-[320px]"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {endpoint === '/cases' && (
          <DataTableFilters 
            filters={filters} 
            setFilters={handleFilterChange} 
            onClear={clearFilters} 
          />
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome Completo</TableHead>
              <TableHead className="w-[140px]">CPF</TableHead>
              
              {endpoint === '/cases' && <TableHead className="w-[180px]">Urgência</TableHead>}
              
              <TableHead className="w-[180px]">
                {endpoint === '/cases/closed' ? 'Data Deslig.' : 'Data Entrada'}
              </TableHead>

              {endpoint === '/cases/closed' && <TableHead className="w-[180px]">Motivo</TableHead>}
              
              <TableHead className="w-[200px]">Responsável</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  {endpoint === '/cases' && <TableCell><Skeleton className="h-6 w-20" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  {endpoint === '/cases/closed' && <TableCell><Skeleton className="h-6 w-32" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))}
            
            {isError && (
              <TableRow>
                <TableCell colSpan={endpoint === '/cases' ? 7 : 8} className="h-32 text-center text-destructive">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p>Erro ao carregar os casos.</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Tentar Novamente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && result?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={endpoint === '/cases' ? 7 : 8} className="h-32 text-center text-muted-foreground">
                  Nenhum caso encontrado.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && result?.items.map((caseItem) => (
              <TableRow key={caseItem.id}>
                
                {/* 1. NOME */}
                <TableCell className="font-medium">
                  <Link
                    to={ROUTES.CASE_DETAIL(caseItem.id)}
                    className="hover:underline hover:text-primary transition-colors block truncate max-w-[250px]"
                    title={caseItem.nomeCompleto}
                  >
                    {caseItem.nomeCompleto}
                  </Link>
                </TableCell>

                {/* 2. CPF */}
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatCPF(caseItem.cpf)}
                </TableCell>

                {/* 3. URGÊNCIA (Com cores e texto) */}
                {endpoint === '/cases' && (
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getUrgencyColor(caseItem.urgencia)} border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide truncate max-w-[160px] block text-center`}
                      title={caseItem.urgencia}
                    >
                      {caseItem.urgencia}
                    </Badge>
                  </TableCell>
                )}
                
                {/* 4. DATA */}
                <TableCell className="text-muted-foreground text-sm">
                  {endpoint === '/cases/closed'
                    ? formatDateSafe(caseItem.dataDesligamento)
                    : formatDistanceToNow(new Date(caseItem.dataEntrada), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                </TableCell>

                {/* 5. MOTIVO (Só fechados) */}
                {endpoint === '/cases/closed' && (
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]" title={caseItem.motivoDesligamento ?? ''}>
                    {caseItem.motivoDesligamento ?? '-'}
                  </TableCell>
                )}

                {/* 6. RESPONSÁVEL */}
                <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                  {caseItem.status === 'EM_ACOMPANHAMENTO_PAEFI' || (endpoint === '/cases/closed' && caseItem.especialistaPAEFI)
                    ? caseItem.especialistaPAEFI?.nome ?? 'Não atribuído'
                    : caseItem.agenteAcolhida?.nome ?? 'Não atribuído'}
                </TableCell>

                {/* 7. STATUS */}
                <TableCell>
                  <CaseStatusBadge status={caseItem.status} />
                </TableCell>

                {/* 8. AÇÕES */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild> 
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="p-0"> 
                        <Link 
                          to={ROUTES.CASE_DETAIL(caseItem.id)} 
                          className="flex w-full items-center px-2 py-1.5 cursor-pointer"
                        >
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
  )
}