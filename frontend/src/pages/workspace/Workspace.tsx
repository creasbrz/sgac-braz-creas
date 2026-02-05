// frontend/src/pages/workspace/Workspace.tsx
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { WorkspaceResponse } from '@/types/workspace'
import { Loader2, AlertTriangle, UserCircle } from 'lucide-react'

// Sub-componentes
import { ManagerWorkspace } from './ManagerWorkspace'
import { SocialAgentWorkspace } from './SocialAgentWorkspace'
import { TechnicianWorkspace } from './TechnicianWorkspace'

// Utilitários de UI
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// --- CONSTANTES DE CARGO ---
const ROLES = {
  GERENTE: 'GERENTE',
  AGENTE_SOCIAL: ['AGENTE_SOCIAL', 'AGENTE'],
  TECNICO: ['ESPECIALISTA', 'TECNICO'],
  AUDITOR: 'AUDITOR'
}

export function Workspace() {
  const { user } = useAuth()
  
  const { data, isLoading, isError, refetch } = useQuery<WorkspaceResponse>({
    queryKey: ['workspace-summary'],
    queryFn: async () => (await api.get('/workspace/summary')).data,
    refetchInterval: 1000 * 60 * 5, // 5 minutos
    retry: 1
  })

  // --- LÓGICA DE APRESENTAÇÃO ---
  
  // Normalização do Cargo
  const userRole = useMemo(() => {
    return data?.role ? data.role.toUpperCase() : ''
  }, [data])

  // Saudação baseada no horário
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Renderização Condicional do Conteúdo
  const renderWorkspaceContent = () => {
    if (!data) return null

    // 1. Visão de Gerente
    if (userRole === ROLES.GERENTE) {
      return <ManagerWorkspace data={data as any} /> 
    }

    // 2. Visão de Agente Social / Acolhida
    if (ROLES.AGENTE_SOCIAL.includes(userRole)) {
      return <SocialAgentWorkspace data={data as any} />
    }

    // 3. Visão de Técnico / Especialista
    if (ROLES.TECNICO.includes(userRole)) {
      return <TechnicianWorkspace data={data as any} />
    }

    // 4. Visão de Auditoria
    if (userRole === ROLES.AUDITOR) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
           <div className="bg-muted p-4 rounded-full mb-4 ring-1 ring-border">
              <UserCircle className="h-10 w-10 opacity-50" />
           </div>
           <p className="font-semibold text-lg text-foreground">Painel de Auditoria</p>
           <p className="text-sm opacity-80 max-w-sm text-center mt-1">Utilize o menu lateral para acessar relatórios globais e ferramentas de fiscalização.</p>
        </div>
      )
    }

    // 5. Fallback: Perfil Não Mapeado
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-status-warning-bg border border-status-warning-border rounded-xl text-status-warning-fg gap-4 px-6">
         <div className="bg-background p-3 rounded-full shadow-sm ring-1 ring-status-warning-border">
            <AlertTriangle className="h-8 w-8 text-status-warning-fg" />
         </div>
         <div className="text-center space-y-1">
            <h3 className="font-bold text-lg text-foreground">Visualização não disponível</h3>
            <p className="text-sm max-w-md mx-auto opacity-90">
              O sistema identificou seu perfil como <strong className="font-semibold">"{userRole}"</strong>, mas não há um painel configurado para este cargo.
            </p>
         </div>
      </div>
    )
  }

  // --- ESTADOS DE CARREGAMENTO / ERRO ---

  if (isLoading) {
    return (
      // max-w-400 = 1600px (Tailwind 4 convention: 400 * 4px)
      <div className="space-y-8 max-w-400 mx-auto p-6 animate-pulse">
        <div className="flex justify-between items-center pb-4 border-b border-border/40">
           <div className="space-y-3">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-md" />
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50"/>
          <p className="text-xs font-semibold uppercase tracking-widest">Sincronizando dados...</p>
        </div>
      </div>
    )
  }
  
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <div className="p-5 bg-status-error-bg rounded-full border border-status-error-border shadow-sm">
           <AlertTriangle className="h-12 w-12 text-status-error-fg" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Falha na conexão</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Não foi possível carregar os dados da sua mesa de trabalho. Verifique sua conexão ou tente novamente.
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="default"
          size="lg"
          className="gap-2 font-semibold shadow-md active:scale-95 transition-all"
        >
          <Loader2 className="h-4 w-4" /> Tentar Novamente
        </Button>
      </div>
    )
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---

  return (
    // max-w-400 = 1600px
    <div className="space-y-8 pb-12 max-w-400 mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700 p-6 md:p-8">
      
      {/* Header da Área de Trabalho */}
      <header className="pb-6 border-b border-border/60">
         <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground bg-clip-text bg-linear-to-r from-foreground to-foreground/70">
              {greeting}, {user?.nome?.split(' ')[0]}.
            </h1>
            <p className="text-muted-foreground text-sm md:text-base flex items-center gap-2">
               Visão operacional do dia • 
               <span className="font-medium text-foreground capitalize">
                 {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
               </span>
            </p>
         </div>
      </header>

      {/* Conteúdo Específico por Cargo */}
      <main className="min-h-125">
        {renderWorkspaceContent()}
      </main>

    </div>
  )
}