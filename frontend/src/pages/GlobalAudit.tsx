import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Link } from "react-router-dom"
import { 
  ShieldCheck, Filter, Search, Lock, 
  Plus, XCircle, UserCheck, FileText, Edit 
} from "lucide-react"

import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/common/Pagination"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/constants/routes"

// Configuração Semântica das Ações (Cor + Ícone)
const ACTION_CONFIG: Record<string, { label: string, style: string, icon: any }> = {
  CRIACAO: { 
    label: "Criação de Caso", 
    style: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100", 
    icon: Plus 
  },
  MUDANCA_STATUS: { 
    label: "Mudança de Status", 
    style: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100", 
    icon: Edit 
  },
  ATRIBUICAO: { 
    label: "Atribuição Técnica", 
    style: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100", 
    icon: UserCheck 
  },
  DESLIGAMENTO: { 
    label: "Desligamento", 
    style: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100", 
    icon: XCircle 
  },
  PAF_CRIADO: { 
    label: "Criação de PAF", 
    style: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", 
    icon: FileText 
  },
  PAF_ATUALIZADO: { 
    label: "Edição de PAF", 
    style: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100", 
    icon: FileText 
  },
  DEFAULT: {
    label: "Outra Ação",
    style: "bg-gray-50 text-gray-700 border-gray-200",
    icon: ShieldCheck
  }
}

interface AuditResponse {
  data: any[]
  meta: {
    total: number
    totalPages: number
    page: number
  }
}

export function GlobalAudit() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)

  const [filters, setFilters] = useState({
    periodo: "7dias",
    acao: "all",
    search: "",
  })

  const { data: responseData, isLoading } = useQuery<AuditResponse>({
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
    placeholderData: keepPreviousData 
  })

  const logs = responseData?.data || []
  const meta = responseData?.meta || { total: 0, totalPages: 1, page: 1 }

  // Bloqueio Institucional
  if (user?.cargo !== "Gerente") {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="p-4 bg-destructive/10 rounded-full">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground">Este módulo de auditoria é exclusivo para a gestão da unidade.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Institucional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Auditoria Global</h1>
              <Badge variant="secondary" className="text-[10px] font-medium border-amber-200 bg-amber-50 text-amber-800">
                <Lock className="h-3 w-3 mr-1" /> Gerencial
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Rastreabilidade e histórico de operações críticas no sistema.
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        {/* Filtros com Densidade Visual Reduzida */}
        <CardHeader className="pb-4 border-b bg-muted/10 pt-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros de Pesquisa
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={filters.acao}
                onValueChange={(v) => { setFilters(prev => ({ ...prev, acao: v })); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background"><SelectValue placeholder="Ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.keys(ACTION_CONFIG).filter(k => k !== 'DEFAULT').map(key => (
                    <SelectItem key={key} value={key}>{ACTION_CONFIG[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.periodo}
                onValueChange={(v) => { setFilters(prev => ({ ...prev, periodo: v })); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background"><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="tudo">Todo o histórico</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por responsável, caso ou detalhe..."
                  className="pl-9 h-9 bg-background"
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilters(prev => ({ ...prev, search: e.target.value })); setPage(1); }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[150px]">Data / Hora</TableHead>
                <TableHead className="w-[200px]">Responsável</TableHead>
                <TableHead className="w-[180px] text-center">Tipo de Ação</TableHead>
                <TableHead>Detalhamento</TableHead>
                <TableHead className="w-[200px]">Caso Vinculado</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><div className="h-8 w-full animate-pulse bg-muted/20 rounded" /></TableCell></TableRow>
              ))}
              {!isLoading && logs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum registro encontrado para os filtros aplicados.</TableCell></TableRow>
              )}
              
              {logs.map((log: any) => {
                const config = ACTION_CONFIG[log.acao] || ACTION_CONFIG.DEFAULT
                const Icon = config.icon

                return (
                  <TableRow key={log.id} className="group hover:bg-muted/5 transition-colors">
                    {/* Data Monoespaçada para alinhamento */}
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    
                    {/* Responsável */}
                    <TableCell>
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-sm text-foreground">{log.autor?.nome || 'Sistema'}</span>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">{log.autor?.cargo || 'AUTO'}</span>
                      </div>
                    </TableCell>
                    
                    {/* Badge Padronizado (Largura Fixa) */}
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-medium w-full justify-center shadow-sm ${config.style}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </div>
                    </TableCell>
                    
                    {/* Descrição com Truncamento Inteligente */}
                    <TableCell className="max-w-[300px]">
                      <span className="text-sm text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors" title={log.descricao}>
                        {log.descricao}
                      </span>
                    </TableCell>
                    
                    {/* Link do Caso */}
                    <TableCell>
                      {log.caso ? (
                        <Link 
                          to={`${ROUTES.CASES}/${log.caso.id}`} 
                          className="text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors flex items-center gap-1 truncate"
                          title="Ir para o caso"
                        >
                          {log.caso.nome}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>

        {/* Rodapé com Paginação e Resumo */}
        <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5">
          <div className="text-xs text-muted-foreground">
            Exibindo <strong>{logs.length}</strong> registros de <strong>{meta.total}</strong> totais
          </div>
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={15}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  )
}