// frontend/src/components/CaseTable.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Search, Edit, FileDown, Loader2, FileSpreadsheet } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { type CaseSummary } from '@/types/case'
import { useDebounce } from '@/hooks/useDebounce'
import { ROUTES } from '@/constants/routes'
import { formatCPF, formatDateSafe } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'
import { getUrgencyColor } from '@/constants/caseConstants'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pagination } from './Pagination'
import { CaseStatusBadge } from './CaseStatusBadge'
import { DataTableFilters } from './DataTableFilters'
import { ImportCasesModal } from '@/components/modals/ImportCasesModal'
import { SavedFilters } from '@/components/SavedFilters'

interface ExtendedCaseSummary extends CaseSummary { urgencia: string }
interface PaginatedCasesResponse { items: ExtendedCaseSummary[]; total: number; page: number; pageSize: number; totalPages: number }
interface CaseTableProps { endpoint: '/cases' | '/cases/closed'; title: string; description: string }

export function CaseTable({ endpoint, title, description }: CaseTableProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const currentPage = Number(searchParams.get('page') ?? '1')
  const [isExporting, setIsExporting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const [filters, setFilters] = useState({ status: '', urgencia: '', violacao: '', categoria: '', sexo: '' })

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }))
    setSearchParams(prev => { prev.set('page', '1'); return prev })
  }

  const clearFilters = () => setFilters({ status: '', urgencia: '', violacao: '', categoria: '', sexo: '' })

  const applySavedFilter = (newFilters: any) => {
    setFilters({
      status: newFilters.status || '',
      urgencia: newFilters.urgencia || '',
      violacao: newFilters.violacao || '',
      categoria: newFilters.categoria || '',
      sexo: newFilters.sexo || ''
    })
    setSearchParams(prev => { prev.set('page', '1'); return prev })
  }

  const { data: result, isLoading } = useQuery<PaginatedCasesResponse>({
    queryKey: ['cases', endpoint, debouncedSearchTerm, currentPage, filters],
    queryFn: async () => {
      const params = {
        search: debouncedSearchTerm || undefined, page: currentPage, pageSize: 10,
        status: filters.status || undefined, urgencia: filters.urgencia || undefined,
        violacao: filters.violacao || undefined, categoria: filters.categoria || undefined, sexo: filters.sexo || undefined
      }
      const response = await api.get(endpoint, { params })
      return response.data
    },
    placeholderData: (prev) => prev, staleTime: 1000 * 30, enabled: !!endpoint,
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

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="text-muted-foreground">{description}</p></div>
        {endpoint === '/cases' && user?.cargo === 'Gerente' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Importar CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />} Exportar CSV</Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9 w-full bg-background" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {endpoint === '/cases' && <SavedFilters currentFilters={filters} onApply={applySavedFilter} />}
        </div>
        {endpoint === '/cases' && <DataTableFilters filters={filters} setFilters={handleFilterChange} onClear={clearFilters} />}
      </div>

      <div className="flex-1 overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead className="w-[140px]">CPF</TableHead>
              {endpoint === '/cases' && <TableHead className="w-[100px]">Urgência</TableHead>}
              <TableHead className="w-[180px]">{endpoint === '/cases/closed' ? 'Desligamento' : 'Entrada'}</TableHead>
              {endpoint === '/cases/closed' && <TableHead className="w-[180px]">Motivo</TableHead>}
              <TableHead className="w-[200px]">Responsável</TableHead><TableHead className="w-[160px]">Status</TableHead><TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)}
            {!isLoading && result?.items.length === 0 && <TableRow><TableCell colSpan={8} className="h-32 text-center">Nenhum caso encontrado.</TableCell></TableRow>}
            {result?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium"><Link to={ROUTES.CASE_DETAIL(item.id)} className="hover:underline hover:text-primary transition-colors block truncate max-w-[250px]" title={item.nomeCompleto}>{item.nomeCompleto}</Link></TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatCPF(item.cpf)}</TableCell>
                {endpoint === '/cases' && <TableCell><Badge variant="outline" className={`${getUrgencyColor(item.urgencia)} border px-2 py-0.5 text-[10px] uppercase truncate max-w-[160px] block text-center`} title={item.urgencia}>{item.urgencia}</Badge></TableCell>}
                <TableCell className="text-muted-foreground text-sm">{endpoint === '/cases/closed' ? formatDateSafe(item.dataDesligamento) : formatDistanceToNow(new Date(item.dataEntrada), { locale: ptBR, addSuffix: true })}</TableCell>
                {endpoint === '/cases/closed' && <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]" title={item.motivoDesligamento ?? ''}>{item.motivoDesligamento ?? '-'}</TableCell>}
                <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{item.status === 'EM_ACOMPANHAMENTO_PAEFI' || (endpoint === '/cases/closed' && item.especialistaPAEFI) ? item.especialistaPAEFI?.nome ?? 'N/A' : item.agenteAcolhida?.nome ?? 'N/A'}</TableCell>
                <TableCell><CaseStatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuItem className="p-0"><Link to={ROUTES.CASE_DETAIL(item.id)} className="flex w-full items-center px-2 py-1.5 cursor-pointer"><Edit className="mr-2 h-4 w-4" /> Ver Detalhes</Link></DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {result && result.total > 0 && <Pagination currentPage={currentPage} totalPages={result.totalPages} totalItems={result.total} pageSize={result.pageSize} onPageChange={handlePageChange} />}
      <ImportCasesModal isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}