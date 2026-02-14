// frontend/src/pages/ClosedCases.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Archive, ShieldCheck, FileClock, 
  History, FolderArchive, Lock, Search, Bookmark 
} from 'lucide-react'

import { CaseTable } from '@/components/case/CaseTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// --- CONFIGURAÇÃO POR PAPEL ---
const ARCHIVE_CONFIG: Record<string, { title: string, description: string, icon: any }> = {
  Gerente: {
    title: 'Arquivo Geral Consolidado',
    description: 'Auditoria completa de casos encerrados e histórico da unidade.',
    icon: Archive
  },
  Agente_Social: {
    title: 'Histórico de Acolhidas',
    description: 'Consulta de triagens e atendimentos iniciais finalizados.',
    icon: History
  },
  Especialista: {
    title: 'Memória Técnica',
    description: 'Prontuários de acompanhamentos (PAEFI) encerrados.',
    icon: FolderArchive
  },
  Auditor: {
    title: 'Auditoria de Passivos',
    description: 'Verificação de conformidade em casos desligados.',
    icon: ShieldCheck
  }
}

export function ClosedCases() {
  const { user, isSessionLoading } = useAuth()
  
  // --- STATE DE BUSCA E ABAS ---
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Debounce para não fazer requisição a cada letra digitada
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  if (isSessionLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 p-6 animate-pulse">
        <div className="flex items-center gap-4 border-b border-border pb-6">
           <Skeleton className="h-12 w-12 rounded-xl" />
           <div className="space-y-2">
             <Skeleton className="h-6 w-64" />
             <Skeleton className="h-4 w-96" />
           </div>
        </div>
        <Skeleton className="flex-1 w-full rounded-xl border border-dashed border-border" />
      </div>
    )
  }

  if (!user) return null

  // Cast seguro para chave de string, com fallback genérico
  const userRole = user.cargo as string
  const config = ARCHIVE_CONFIG[userRole] || {
    title: 'Desligados',
    description: 'Consulta de casos encerrados.',
    icon: Archive
  }

  const Icon = config.icon

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER "ARQUIVO" */}
      <div className="flex-none p-6 pb-2">
         <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            
            {/* Lado Esquerdo: Identificação por Papel */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted/30 rounded-xl border border-border shadow-sm text-muted-foreground shrink-0">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {config.title}
                  </h1>
                  <Badge variant="outline" className="border-dashed border-border text-muted-foreground bg-muted/30 font-medium gap-1.5 py-0.5 shadow-none">
                    <Lock className="h-3 w-3 opacity-70" /> Somente Leitura
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileClock className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  {config.description}
                </p>
              </div>
            </div>

            {/* Lado Direito: Busca e Abas (Referenciados) */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 xl:pt-0 shrink-0">
               <div className="relative w-full sm:w-64 md:w-80">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar nome ou CPF..."
                   className="w-full pl-9 bg-background shadow-sm h-9"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto h-9">
                 <TabsList className="grid w-full grid-cols-2 h-9">
                   <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                   <TabsTrigger 
                     value="referenced" 
                     className="flex items-center gap-1.5 text-xs text-purple-700 data-[state=active]:text-purple-700 data-[state=active]:bg-purple-100/50"
                   >
                     <Bookmark className="h-3 w-3 fill-current" />
                     Referenciados
                   </TabsTrigger>
                 </TabsList>
               </Tabs>
            </div>
         </div>
      </div>

      {/* ÁREA DE CONTEÚDO (TABELA) */}
      <div className="flex-1 p-6 pt-4 overflow-hidden flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-2 border-dashed border-border bg-muted/10 shadow-none rounded-xl relative">
            <CardContent className="flex-1 p-0 flex flex-col min-h-0 relative z-10">
              
              {/* Overlay Decorativo de "Arquivo" */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 opacity-[0.03] pointer-events-none z-0">
                 <Archive className="h-96 w-96 text-foreground" />
              </div>

              {/* Tabela de Casos Fechados */}
              <div className="flex-1 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <CaseTable
                    endpoint="/cases/closed"
                    defaultView="all"
                    hideHeader={false} // Mantém os filtros internos (Violação, Sexo, etc.)
                    queryParams={{
                      search: debouncedSearch,
                      manterReferencia: activeTab === 'referenced' ? 'true' : undefined
                    }}
                    className="border-none shadow-none bg-transparent h-full"
                  />
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}