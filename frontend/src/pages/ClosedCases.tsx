import { CaseTable } from '@/components/case/CaseTable'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Archive, ShieldCheck, FileClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ClosedCases() {
  const { user, isSessionLoading } = useAuth()

  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    )
  }

  // Definição de Títulos (Linguagem Institucional Refinada)
  const titlesByRole: Record<string, string> = {
    Gerente: 'Histórico Consolidado',
    'Agente_Social': 'Arquivo de Acolhidas',
    Especialista: 'Memória de Acompanhamentos',
  }

  const title = titlesByRole[user.cargo] ?? 'Histórico de Casos'

  const description =
    user.cargo === 'Gerente'
      ? 'Consulta completa e auditoria de todos os casos desligados da unidade.'
      : 'Acesso para consulta aos prontuários encerrados sob sua responsabilidade.'

  return (
    <div className="space-y-6 h-full flex flex-col p-2 sm:p-0 animate-in fade-in duration-500">
      
      {/* Cabeçalho Distinto ("Modo Arquivo") */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-4 bg-muted/10 -mx-2 px-4 pt-4 rounded-t-lg sm:mx-0 sm:px-0 sm:pt-0 sm:bg-transparent sm:rounded-none">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-md border shadow-sm">
              <Archive className="h-5 w-5 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {title}
            </h1>
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-dashed bg-background/50">
              <ShieldCheck className="h-3 w-3 mr-1" /> Somente Leitura
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl flex items-center gap-2">
            <FileClock className="h-3.5 w-3.5 opacity-70" />
            {description}
          </p>
        </div>
      </div>

      {/* Tabela com Opacidade Sutil (Reforça ideia de histórico) */}
      <div className="flex-1 opacity-90 transition-opacity hover:opacity-100">
        <CaseTable
          title="" // Título suprimido pois já renderizamos o cabeçalho customizado acima
          description=""
          endpoint="/cases/closed"
          defaultView="all" // Arquivo geralmente é visto em lista completa
        />
      </div>
    </div>
  )
}