// frontend/src/pages/GlobalAudit.tsx
// 🔧 Página de Auditoria Global com filtros avançados, busca inteligente,
// tabela responsiva e integração otimizada com a API modernizada.

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ShieldCheck, Filter, Search} from "lucide-react"

import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/Pagination"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"

// Lista de ações para filtro
const ACOES = [
  { value: "CRIACAO", label: "Criação de Caso" },
  { value: "MUDANCA_STATUS", label: "Mudança de Status" },
  { value: "ATRIBUICAO", label: "Atribuição Técnica" },
  { value: "DESLIGAMENTO", label: "Desligamento" },
]

export function GlobalAudit() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({
    periodo: "7dias",
    acao: "all",
    search: "",
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, filters],
    queryFn: async () => {
      const res = await api.get("/audit", {
        params: {
          page,
          pageSize: 15,
          periodo: filters.periodo,
          acao: filters.acao === "all" ? undefined : filters.acao,
          search: filters.search || undefined,
        },
      })
      return res.data
    },
  })

  // Estilização visual dos badges de ação
  const actionBadge = (acao: string) => {
    const map: Record<string, string> = {
      DESLIGAMENTO: "bg-red-100 text-red-700 border-red-200",
      CRIACAO: "bg-blue-100 text-blue-700 border-blue-200",
      ATRIBUICAO: "bg-purple-100 text-purple-700 border-purple-200",
    }
    return map[acao] ?? "bg-gray-100 text-gray-700 border-gray-200"
  }

  if (user?.cargo !== "Gerente") {
    return <div className="p-10 text-center text-destructive">Acesso negado.</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* TÍTULO */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-full">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Auditoria Global</h1>
          <p className="text-muted-foreground">
            Monitore todas as ações críticas realizadas no sistema.
          </p>
        </div>
      </div>

      {/* CARD DE FILTROS */}
      <Card>
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between gap-4">

            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filtros Avançados
            </CardTitle>

            <div className="flex flex-col sm:flex-row gap-3">

              {/* FILTRO DE AÇÃO */}
              <Select
                value={filters.acao}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, acao: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {ACOES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* FILTRO POR PERÍODO */}
              <Select
                value={filters.periodo}
                onValueChange={(v) => {
                  setFilters(prev => ({ ...prev, periodo: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="tudo">Todo o histórico</SelectItem>
                </SelectContent>
              </Select>

              {/* BARRA DE BUSCA — NOVO */}
              <div className="relative w-full sm:w-[240px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, descrição..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFilters(prev => ({ ...prev, search: e.target.value }))
                    setPage(1)
                  }}
                />
              </div>

            </div>
          </div>
        </CardHeader>

        {/* TABELA */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[150px]">Data</TableHead>
                <TableHead className="w-[180px]">Responsável</TableHead>
                <TableHead className="w-[140px]">Ação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[220px]">Caso</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* LOADING */}
              {isLoading &&
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-8 w-full animate-pulse bg-muted/20 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              }

              {/* ERRO */}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive py-10">
                    Erro ao carregar registros.
                  </TableCell>
                </TableRow>
              )}

              {/* SEM DADOS */}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}

              {/* DADOS */}
              {data?.items.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-sm">{log.autor.nome}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {log.autor.cargo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${actionBadge(log.acao)} text-[10px]`}>
                      {log.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.descricao}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-primary">
                    {log.caso?.nomeCompleto || "--"}
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </CardContent>

        {/* PAGINAÇÃO */}
        <div className="p-4 border-t">
          <Pagination
            currentPage={page}
            totalPages={data?.totalPages || 1}
            totalItems={data?.total || 0}
            pageSize={15}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  )
}
