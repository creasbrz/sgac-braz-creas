// frontend/src/pages/GlobalAudit.tsx
import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Link } from "react-router-dom"
import { 
  ShieldCheck, Filter, Search, Lock, 
  Plus, XCircle, UserCheck, FileText, Edit,
  ShieldAlert, CalendarRange, RotateCcw
} from "lucide-react"

import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/common/Pagination"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { ROUTES } from "@/constants/app-routes"

// Configuração Semântica das Ações (Cor + Ícone)
const ACTION_CONFIG: Record<string, { label: string, className: string, icon: any }> = {
  CRIACAO: { 
    label: "Criação de Caso", 
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", 
    icon: Plus 
  },
  MUDANCA_STATUS: { 
    label: "Mudança de Status", 
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800", 
    icon: Edit 
  },
  ATRIBUICAO: { 
    label: "Atribuição Técnica", 
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800", 
    icon: UserCheck 
  },
  DESLIGAMENTO: { 
    label: "Desligamento", 
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
    icon: XCircle 
  },
  PAF_CRIADO: { 
    label: "Criação de PAF", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", 
    icon: FileText 
  },
  PAF_ATUALIZADO: { 
    label: "Edição de PAF", 
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
    icon: FileText 
  },
  DEFAULT: {
    label: "Outra Ação",
    className: "bg-muted text-muted-foreground border-border",
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

  const resetFilters = () => {
    setFilters({ periodo: "7dias", acao: "all", search: "" })
    setPage(1)
  }

  // 

  // Bloqueio Institucional
  if (user?.cargo !== "Gerente") {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
          <div className="relative p-6 bg-background rounded-full border border-destructive/20 shadow-xl">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O módulo de auditoria contém dados sensíveis e é restrito exclusivamente ao perfil de <strong>Gerência</strong>. Entre em contato com o administrador se acredita que isso é um erro.
          </p>
        </div>
        <Button variant="outline" asChild>
           <Link to={ROUTES.DASHBOARD}>Voltar ao Início</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 max-w-480 mx-auto">
      
      {/* Header Institucional */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-sm shrink-0">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditoria Global</h1>
              <Badge variant="outline" className="text-[10px] font-medium border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 gap-1">
                <Lock className="h-3 w-3" /> Acesso Gerencial
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Rastreabilidade completa de operações críticas, alterações de status e acessos no sistema para fins de conformidade e segurança.
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border border-border bg-card">
        {/* Barra de Ferramentas / Filtros */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground shrink-0">
              <Filter className="h-4 w-4" /> Filtros
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
               {/* Search */}
               <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, caso ou ID..."
                  className="pl-9 h-9 bg-background border-border/60 focus:border-primary"
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFilters(prev => ({ ...prev, search: e.target.value })); setPage(1); }}
                />
              </div>

              {/* Select Ação */}
              <Select
                value={filters.acao}
                onValueChange={(v) => { setFilters(prev => ({ ...prev, acao: v })); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-50 h-9 bg-background border-border/60">
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.keys(ACTION_CONFIG).filter(k => k !== 'DEFAULT').map(key => (
                    <SelectItem key={key} value={key}>{ACTION_CONFIG[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Select Período */}
              <Select
                value={filters.periodo}
                onValueChange={(v) => { setFilters(prev => ({ ...prev, periodo: v })); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-45 h-9 bg-background border-border/60">
                   <div className="flex items-center gap-2 truncate">
                      <CalendarRange className="h-3.5 w-3.5 opacity-70" />
                      <SelectValue placeholder="Período" />
                   </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="tudo">Todo o histórico</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset */}
              {(filters.search || filters.acao !== 'all' || filters.periodo !== '7dias') && (
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-9 w-9 shrink-0" title="Limpar filtros">
                   <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="w-45 font-semibold text-muted-foreground">Data / Hora</TableHead>
                <TableHead className="w-55 font-semibold text-muted-foreground">Responsável</TableHead>
                <TableHead className="w-50 text-center font-semibold text-muted-foreground">Tipo de Ação</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Detalhamento</TableHead>
                <TableHead className="w-55 font-semibold text-muted-foreground">Caso Vinculado</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading && [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><div className="h-10 w-full animate-pulse bg-muted/30 rounded-md" /></TableCell></TableRow>
              ))}
              
              {!isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                       <div className="p-4 bg-muted/30 rounded-full border border-border">
                          <Search className="h-8 w-8 opacity-50" />
                       </div>
                       <p className="font-medium">Nenhum registro de auditoria encontrado.</p>
                       <p className="text-xs opacity-70">Tente ajustar os filtros ou o período de busca.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              
              {logs.map((log: any) => {
                const config = ACTION_CONFIG[log.acao] || ACTION_CONFIG.DEFAULT
                const Icon = config.icon

                return (
                  <TableRow key={log.id} className="group hover:bg-muted/5 transition-colors border-b border-border/50">
                    {/* Data Monoespaçada */}
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap align-top py-3">
                      <div className="flex flex-col gap-0.5">
                         <span className="font-medium text-foreground">{format(new Date(log.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                         <span className="opacity-70">{format(new Date(log.createdAt), "HH:mm:ss")}</span>
                      </div>
                    </TableCell>
                    
                    {/* Responsável */}
                    <TableCell className="align-top py-3">
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-sm text-foreground">{log.autor?.nome || 'Sistema Automático'}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground/70 mt-0.5">{log.autor?.cargo?.replace('_', ' ') || 'SYSTEM'}</span>
                      </div>
                    </TableCell>
                    
                    {/* Badge Padronizado */}
                    <TableCell className="text-center align-top py-3">
                      <Badge variant="outline" className={`font-medium shadow-sm gap-1.5 py-1 ${config.className}`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    
                    {/* Descrição */}
                    <TableCell className="max-w-100 align-top py-3">
                      <p className="text-sm text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors leading-relaxed" title={log.descricao}>
                        {log.descricao}
                      </p>
                    </TableCell>
                    
                    {/* Link do Caso */}
                    <TableCell className="align-top py-3">
                      {log.caso ? (
                        <Link 
                          to={`${ROUTES.CASES}/${log.caso.id}`} 
                          className="text-sm font-medium text-primary hover:underline hover:text-primary/80 transition-colors flex items-center gap-1.5 truncate group/link"
                          title="Ver prontuário"
                        >
                          <FileText className="h-3.5 w-3.5 opacity-70 group-hover/link:opacity-100" />
                          {log.caso.nome}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic px-2">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>

        {/* Rodapé com Paginação */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/5">
          <div className="text-xs text-muted-foreground font-medium">
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