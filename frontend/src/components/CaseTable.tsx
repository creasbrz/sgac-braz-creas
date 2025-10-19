// frontend/src/components/CaseTable.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { clsx } from 'clsx'
import { CalendarPlus, Download, Search } from 'lucide-react'
import { toast } from 'sonner'

import { CASE_STATUS_MAP, type CaseStatusIdentifier } from '@/constants/caseConstants'
import { ROUTES } from '@/constants/routes'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCPF } from '@/utils/formatters'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { useDebounce } from '@/hooks/useDebounce'
import { getErrorMessage } from '@/utils/error'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from './ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'

interface Case {
  id: string
  nomeCompleto: string
  cpf: string
  status: string
}

interface PaginatedCases {
  items: Case[]
  totalPages: number
}

function CaseRow({ caseData }: { caseData: Case }) {
  const statusInfo = CASE_STATUS_MAP[caseData.status as CaseStatusIdentifier]

  return (
    <TableRow>
      <TableCell className="font-medium">{caseData.nomeCompleto}</TableCell>
      <TableCell>{formatCPF(caseData.cpf)}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={clsx(
            'border-transparent',
            statusInfo?.style ?? 'bg-gray-100 text-gray-800',
          )}
        >
          {statusInfo?.text ?? caseData.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button asChild variant="ghost" size="icon" title={`Agendar para ${caseData.nomeCompleto}`}>
          <Link to={`${ROUTES.AGENDA}?caseId=${caseData.id}`}>
            <CalendarPlus className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" title={`Ver detalhes de ${caseData.nomeCompleto}`}>
          <Link to={ROUTES.CASE_DETAIL.replace(':id', caseData.id)}>Ver</Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function CaseTable() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [isExporting, setIsExporting] = useState(false)

  // Correção: A query agora espera um objeto paginado
  const {
    data,
    isLoading,
    isError,
  } = useQuery<PaginatedCases>({
    queryKey: ['cases', debouncedSearchTerm, statusFilter, page],
    queryFn: async () => {
      const response = await api.get('/cases', {
        params: {
          search: debouncedSearchTerm,
          status: statusFilter,
          page,
        },
      })
      return response.data
    },
  })

  const cases = data?.items

  const handleStatusChange = (value: string) => {
    setPage(1)
    setStatusFilter(value === 'all' ? '' : value)
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
    })

    setIsExporting(false)
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-4 flex flex-col sm:flex-row items-center gap-4 border-b">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Procurar por nome ou CPF..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select
            value={statusFilter || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(CASE_STATUS_MAP).map(([key, { text }]) => (
                <SelectItem key={key} value={key}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {user?.cargo === 'Gerente' && (
          <Button onClick={handleExport} disabled={isExporting} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell colSpan={4} className="p-4">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {isError && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-10 text-center text-destructive"
              >
                Falha ao carregar os casos.
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isError && cases?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-10 text-center text-muted-foreground"
              >
                Nenhum caso encontrado.
              </TableCell>
            </TableRow>
          )}
          {cases?.map((c) => (
            <CaseRow key={c.id} caseData={c} />
          ))}
        </TableBody>
      </Table>
      {data && data.totalPages > 1 && (
        <div className="p-4 border-t flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.max(1, p - 1))
                  }}
                  aria-disabled={page === 1}
                />
              </PaginationItem>
              
              <PaginationItem>
                <span className="px-4 py-2 text-sm">
                  Página {page} de {data.totalPages}
                </span>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }}
                  aria-disabled={page === data.totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}