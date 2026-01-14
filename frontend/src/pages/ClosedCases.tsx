// frontend/src/pages/ClosedCases.tsx
import { useAuth } from '@/hooks/useAuth'
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
      <div className="space-y-6 p-1 animate-pulse">
        <div className="flex items-center gap-4">
           <Skeleton className="h-12 w-12 rounded-lg" />
           <div className="space-y-2">
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-64" />
           </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  if (!user) return null

  const config = ARCHIVE_CONFIG[user.cargo as keyof typeof ARCHIVE_CONFIG] || {
    title: 'Arquivo Morto',
    description: 'Consulta de casos encerrados.',
    icon: Archive
  }

  const Icon = config.icon

  return (
    // [FIX 1] Definimos uma altura fixa calculada para a página inteira
    // Isso força o container a ocupar a tela e permite que os filhos usem flex-1 corretamente
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 animate-in fade-in duration-500">
      
      {/* HEADER "ARQUIVO" */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-400">
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {config.title}
              </h1>
              <Badge variant="outline" className="border-dashed border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400 font-normal gap-1.5 py-0.5">
                <Lock className="h-3 w-3" /> Somente Leitura
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <FileClock className="h-3.5 w-3.5 opacity-70" />
              {config.description}
            </p>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO (CARD) */}
      {/* [FIX 2] Flex-1 aqui faz o card crescer até o fundo da tela definida no container pai */}
      <Card className="flex-1 flex flex-col overflow-hidden border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 shadow-sm">
        
        {/* [FIX 3] Removemos 'absolute' e usamos flexbox normal para evitar colapso */}
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <CaseTable
            endpoint="/cases/closed"
            title="" 
            description=""
            defaultView="all"
            // [FIX 4] Estilização para fundir a tabela com o card de arquivo
            // Removemos bordas e sombras da tabela interna para não duplicar com o card externo
            className="h-full border-none shadow-none bg-transparent"
          />
        </CardContent>
      </Card>
    </div>
  )
}