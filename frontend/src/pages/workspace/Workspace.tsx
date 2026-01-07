import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { WorkspaceResponse } from '@/types/workspace'
import { Loader2 } from 'lucide-react'

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

  if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary"/><p className="text-muted-foreground animate-pulse">Carregando...</p></div>
  
  if (isError || !data) return <div className="p-8 text-center text-destructive">Erro ao carregar dados da mesa.</div>

  return (
    <div className="space-y-6 pb-10 max-w-[1600px] mx-auto">
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

      {/* Roteamento de Componentes */}
      {data.role === 'GERENTE' && <ManagerWorkspace data={data as any} />}
      
      {data.role === 'AGENTE_SOCIAL' && <SocialAgentWorkspace data={data as any} />}
      
      {data.role === 'ESPECIALISTA' && <TechnicianWorkspace data={data as any} />}
      
      {data.role === 'AUDITOR' && (
        <div className="p-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
           Auditoria utiliza o painel global.
        </div>
      )}
    </div>
  )
}