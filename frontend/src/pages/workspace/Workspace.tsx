import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { WorkspaceResponse } from '@/types/workspace'
import { Loader2, AlertTriangle } from 'lucide-react'

// Imports dos novos arquivos modulares
import { ManagerWorkspace } from './ManagerWorkspace'
import { SocialAgentWorkspace } from './SocialAgentWorkspace'
import { TechnicianWorkspace } from './TechnicianWorkspace'

export function Workspace() {
  const { user } = useAuth()
  
  const { data, isLoading, isError } = useQuery<WorkspaceResponse>({
    queryKey: ['workspace-summary'],
    queryFn: async () => (await api.get('/workspace/summary')).data,
    refetchInterval: 1000 * 60 * 5
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary"/>
        <p className="text-muted-foreground animate-pulse">Carregando sua mesa de trabalho...</p>
      </div>
    )
  }
  
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-destructive gap-2">
        <AlertTriangle className="h-12 w-12" />
        <p className="font-semibold">Erro ao carregar dados da mesa.</p>
        <p className="text-sm text-muted-foreground">Tente recarregar a página.</p>
      </div>
    )
  }

  // [CORREÇÃO CRÍTICA] Normalização do Cargo (Role)
  // Converte para maiúsculas para garantir que 'Agente_Social' bata com 'AGENTE_SOCIAL'
  const userRole = data.role ? data.role.toUpperCase() : ''

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Comum */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-2 border-b border-border mb-2">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Mesa de Trabalho</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Operacional diário - {user?.nome}
            </p>
         </div>
         <div className="hidden md:flex items-center gap-3">
             <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Perfil</span>
                <span className="text-sm font-semibold text-foreground">{data.role.replace('_', ' ')}</span>
             </div>
             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                {user?.nome.charAt(0)}
             </div>
         </div>
      </div>

      {/* Roteamento de Componentes com Normalização */}
      {userRole === 'GERENTE' && <ManagerWorkspace data={data as any} />}
      
      {(userRole === 'AGENTE_SOCIAL' || userRole === 'AGENTE') && (
        <SocialAgentWorkspace data={data as any} />
      )}
      
      {(userRole === 'ESPECIALISTA' || userRole === 'TECNICO') && (
        <TechnicianWorkspace data={data as any} />
      )}
      
      {userRole === 'AUDITOR' && (
        <div className="p-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
           Auditoria utiliza o painel global.
        </div>
      )}

      {/* [DEBUG] Fallback para Tela Branca: Mostra se o cargo não foi reconhecido */}
      {!['GERENTE', 'AGENTE_SOCIAL', 'AGENTE', 'ESPECIALISTA', 'TECNICO', 'AUDITOR'].includes(userRole) && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex flex-col items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="font-bold">Perfil não mapeado</h3>
            <p>O sistema recebeu o perfil: <strong>"{data.role}"</strong> (Normalizado: {userRole}), mas não há uma visualização configurada para ele.</p>
        </div>
      )}
    </div>
  )
}