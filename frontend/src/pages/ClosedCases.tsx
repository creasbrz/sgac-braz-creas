// frontend/src/pages/ClosedCases.tsx
import { useAuth } from '@/contexts/AuthContext'
import { 
  Archive, ShieldCheck, FileClock, 
  History, FolderArchive, Lock 
} from 'lucide-react'

import { CaseTable } from '@/components/case/CaseTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// --- CONFIGURAÇÃO POR PAPEL ---
const ARCHIVE_CONFIG = {
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

  const config = ARCHIVE_CONFIG[user.cargo as keyof typeof ARCHIVE_CONFIG] || {
    title: 'Desligados',
    description: 'Consulta de casos encerrados.',
    icon: Archive
  }

  const Icon = config.icon

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER "ARQUIVO" */}
      <div className="flex-none p-6 pb-2">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted/30 rounded-xl border border-border shadow-sm text-muted-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {config.title}
                  </h1>
                  <Badge variant="outline" className="border-dashed border-border text-muted-foreground bg-muted/30 font-medium gap-1.5 py-0.5 shadow-none">
                    <Lock className="h-3 w-3 opacity-70" /> Somente Leitura
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2 leading-none">
                  <FileClock className="h-3.5 w-3.5 opacity-70" />
                  {config.description}
                </p>
              </div>
            </div>
         </div>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 p-6 pt-4 overflow-hidden flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col overflow-hidden border-2 border-dashed border-border bg-muted/10 shadow-none rounded-xl">
            <CardContent className="flex-1 p-0 flex flex-col min-h-0 relative">
              
              {/* Overlay Decorativo de "Arquivo" */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <Archive className="h-64 w-64 text-foreground rotate-12" />
              </div>

              <div className="flex-1 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <CaseTable
                    endpoint="/cases/closed"
                    title="" 
                    description=""
                    defaultView="all"
                    // Estilização para fundir a tabela com o card de arquivo de forma transparente
                    className="border-none shadow-none bg-transparent"
                  />
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}