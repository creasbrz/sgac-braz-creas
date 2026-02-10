// frontend/src/pages/TeamOverview.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Eye, ArrowLeft, Briefcase, ShieldAlert, Lock, UserCheck, Users, BarChart3
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CaseTable } from '@/components/case/CaseTable'
import { useAuth } from '@/contexts/AuthContext'
import { usePrivacy } from '@/contexts/PrivacyContext'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- TYPES ---
interface TeamMemberStats {
  id: string
  name: string
  role: 'Especialista' | 'Agente_Social' | 'Gerente'
  active: number 
  monitoring: number 
}

// --- SUBCOMPONENTE: LINHA DA TABELA ---
const TeamRow = ({ member, maxLoad, onDetails }: { member: TeamMemberStats, maxLoad: number, onDetails: (m: TeamMemberStats) => void }) => {
  const { isPrivacyMode } = usePrivacy()

  // Cálculo ponderado: Monitoramento pesa 20% de um caso ativo
  const weightedLoad = member.active + (member.monitoring * 0.2)
  const loadPercentage = Math.min((weightedLoad / maxLoad) * 100, 100)
  
  // Cores Semânticas de Carga (Tailwind v4)
  // Nota: Usamos strings completas para garantir que o Tailwind detecte as classes
  let indicatorClass = "[&>*]:bg-emerald-500" // Saudável
  let statusText = "Normal"
  let statusTextColor = "text-emerald-600 dark:text-emerald-400"

  if (loadPercentage >= 80) { 
      indicatorClass = "[&>*]:bg-amber-500"; 
      statusText = "Alta";
      statusTextColor = "text-amber-600 dark:text-amber-400"
  } 
  if (loadPercentage >= 100) { 
      indicatorClass = "[&>*]:bg-destructive"; 
      statusText = "Crítica";
      statusTextColor = "text-destructive font-bold"
  }

  return (
    <TableRow className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
      <TableCell className="py-3 pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
            <AvatarFallback className={cn(
              "text-xs text-muted-foreground bg-muted font-bold transition-all duration-300",
              isPrivacyMode && "blur-[3px]"
            )}>
              {member.name.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className={cn(
              "font-semibold text-sm text-foreground transition-all duration-300",
              isPrivacyMode && "blur-[5px] select-none opacity-80"
            )}>
              {member.name}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {member.role.replace('_', ' ')}
            </span>
          </div>
        </div>
      </TableCell>
      
      {/* Coluna de Carga Visual */}
      <TableCell>
        {/* [CORREÇÃO] max-w-[180px] -> max-w-45 */}
        <div className="w-full max-w-45 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-medium">
            <span className={cn(statusTextColor)}>
              {statusText} ({Math.round(loadPercentage)}%)
            </span>
            <span className="tabular-nums text-muted-foreground opacity-80">
                {Math.round(weightedLoad * 10) / 10} / {maxLoad} un.
            </span>
          </div>
          {/* [CORREÇÃO] Removemos indicatorClassName e usamos seletor filho [&>*] no className */}
          <Progress 
            value={loadPercentage} 
            className={cn("h-1.5 bg-muted/50", indicatorClass)} 
          />
        </div>
      </TableCell>

      <TableCell className="text-center">
        {/* [CORREÇÃO] min-w-[2.5rem] -> min-w-10 */}
        <div className="inline-flex items-center justify-center min-w-10 h-6 px-2 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold tabular-nums border border-blue-100 dark:border-blue-800">
          {member.active}
        </div>
      </TableCell>
      
      <TableCell className="text-center">
        {member.role === 'Especialista' ? (
          /* [CORREÇÃO] min-w-[2.5rem] -> min-w-10 */
          <div className="inline-flex items-center justify-center min-w-10 h-6 px-2 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs font-bold tabular-nums border border-cyan-100 dark:border-cyan-800">
            {member.monitoring}
          </div>
        ) : (
          <span className="text-muted-foreground/30 select-none">-</span>
        )}
      </TableCell>

      <TableCell className="text-right pr-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDetails(member)}
          className="h-8 px-3 hover:bg-primary/10 hover:text-primary transition-colors font-medium text-xs gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" /> Detalhes
        </Button>
      </TableCell>
    </TableRow>
  )
}

const TeamDetailView = ({ member, onBack }: { member: TeamMemberStats, onBack: () => void }) => {
  const { isPrivacyMode } = usePrivacy()
  
  const filterParams = member.role === 'Agente_Social' 
    ? { agenteId: member.id }
    : { specialistId: member.id }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col p-1">
      
      {/* Header do Perfil */}
      <div className="flex flex-col gap-6 border-b border-border pb-6">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground group">
             <ArrowLeft className="mr-1 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Voltar
           </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
           <div className="flex items-center gap-5">
             {/* [CORREÇÃO] blur-[4px] -> blur-xs */}
             <Avatar className="h-16 w-16 border-2 border-background shadow-md ring-1 ring-border/50">
               <AvatarFallback className={cn("bg-primary/10 text-primary text-xl font-bold", isPrivacyMode && "blur-xs")}>
                 {member.name.substring(0,2).toUpperCase()}
               </AvatarFallback>
             </Avatar>
             <div className="space-y-1.5">
                 <h2 className={cn("text-2xl font-bold tracking-tight text-foreground", isPrivacyMode && "blur-[6px] select-none")}>
                   {member.name}
                 </h2>
                 <div className="flex items-center gap-2.5">
                   <Badge variant="secondary" className="rounded-md px-2.5 py-0.5 font-medium text-muted-foreground border border-border/60 bg-muted/50">
                     {member.role.replace('_', ' ')}
                   </Badge>
                   <span className="text-xs text-muted-foreground font-mono opacity-70">ID: {member.id.substring(0,8)}</span>
                 </div>
             </div>
           </div>

           <div className="flex gap-4">
             {/* [CORREÇÃO] min-w-[120px] -> min-w-30 */}
             <Card className="flex flex-col items-center justify-center p-4 min-w-30 border-l-4 border-l-blue-500 shadow-sm bg-card/50">
                 <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Casos Ativos</span>
                 <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{member.active}</span>
             </Card>
             {member.role === 'Especialista' && (
               /* [CORREÇÃO] min-w-[120px] -> min-w-30 */
               <Card className="flex flex-col items-center justify-center p-4 min-w-30 border-l-4 border-l-cyan-500 shadow-sm bg-card/50">
                   <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Monitoramento</span>
                   <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{member.monitoring}</span>
               </Card>
             )}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 px-6 border-b border-border bg-muted/30 flex justify-between items-center">
           <h3 className="font-semibold flex items-center gap-2 text-foreground">
             <div className="p-1.5 bg-background rounded-md border border-border/60 shadow-sm">
                <Briefcase className="h-4 w-4 text-primary"/> 
             </div>
             Casos Vinculados
           </h3>
        </div>
        <div className="flex-1 min-h-0 bg-background">
           <CaseTable 
             endpoint="/cases"
             title=""
             description=""
             defaultView="all"
             queryParams={filterParams}
             className="border-none shadow-none"
           />
        </div>
      </div>
    </div>
  )
}

export function TeamOverview() {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState<TeamMemberStats | null>(null)

  const { data: teamStats, isLoading } = useQuery<TeamMemberStats[]>({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const res = await api.get('/stats/productivity')
      return res.data
    },
    enabled: !!user,
    staleTime: 1000 * 60 
  })

  // Permissão
  if (user?.cargo !== 'Gerente' && user?.cargo !== 'Auditor') { 
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95 p-4">
        <div className="p-5 bg-destructive/10 rounded-full border border-destructive/20 shadow-sm">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O módulo de gestão de equipe é exclusivo para perfis de <strong>Gerência</strong> e <strong>Auditoria</strong>.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
        </Button>
      </div>
    )
  }

  if (selectedUser) {
    return <TeamDetailView member={selectedUser} onBack={() => setSelectedUser(null)} />
  }

  const specialists = teamStats?.filter(t => t.role === 'Especialista') || []
  const agents = teamStats?.filter(t => t.role === 'Agente_Social') || []

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10 p-2">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
             <Users className="h-7 w-7 text-primary/80" /> Gestão da Equipe
          </h1>
          <p className="text-muted-foreground text-sm pl-1">
             Monitoramento de carga de trabalho e distribuição estratégica de casos.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-card px-5 py-3 rounded-xl border border-border shadow-sm w-full sm:w-auto">
           <div className="p-2.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
             <BarChart3 className="h-6 w-6" />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Total em Atendimento</span>
             <span className="text-2xl font-bold text-foreground leading-none tabular-nums tracking-tight">
               {teamStats?.reduce((a,b) => a + b.active, 0) || 0}
             </span>
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 p-1">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Card className="border border-border/60 shadow-sm">
             <div className="p-6 space-y-6">
                {[1,2,3,4].map(i => (
                   <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                         <Skeleton className="h-4 w-1/4" />
                         <Skeleton className="h-3 w-1/6" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                   </div>
                ))}
             </div>
          </Card>
        </div>
      ) : (
        <Tabs defaultValue="agents" className="w-full">
          <div className="flex items-center justify-between mb-6">
             {/* [CORREÇÃO] max-w-[400px] -> max-w-100 */}
             <TabsList className="grid w-full max-w-100 grid-cols-2 bg-muted/40 p-1 rounded-lg border border-border/40">
               <TabsTrigger value="agents" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                 <UserCheck className="h-4 w-4" /> Agentes
               </TabsTrigger>
               <TabsTrigger value="specialists" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                 <ShieldAlert className="h-4 w-4" /> Especialistas
               </TabsTrigger>
             </TabsList>
          </div>

          {/* TAB AGENTES */}
          <TabsContent value="agents" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-left-2 duration-300">
            <Card className="shadow-sm border border-border bg-card overflow-hidden">
              <CardHeader className="pb-4 border-b border-border bg-muted/20 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
                         <UserCheck className="h-4 w-4" /> 
                      </div>
                      Agentes Sociais
                    </CardTitle>
                    <CardDescription>Responsáveis pela triagem e acolhida inicial.</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-7 font-medium text-muted-foreground bg-background gap-2 px-3 border-border shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"/>
                    Meta: 25 casos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs uppercase tracking-wider font-semibold border-b border-border/60">
                      <TableHead className="w-[35%] pl-6 h-11 text-muted-foreground">Servidor</TableHead>
                      <TableHead className="w-[25%] h-11 text-muted-foreground">Ocupação</TableHead>
                      <TableHead className="text-center h-11 text-muted-foreground">Ativos</TableHead>
                      <TableHead className="text-center h-11 text-muted-foreground">-</TableHead>
                      <TableHead className="text-right pr-6 h-11 text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                             <div className="p-3 bg-muted/50 rounded-full">
                                <Users className="h-6 w-6 opacity-30" />
                             </div>
                             <p>Nenhum agente encontrado.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      agents.map(member => (
                        <TeamRow key={member.id} member={member} maxLoad={50} onDetails={setSelectedUser} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB ESPECIALISTAS */}
          <TabsContent value="specialists" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-right-2 duration-300">
            <Card className="shadow-sm border border-border bg-card overflow-hidden">
              <CardHeader className="pb-4 border-b border-border bg-muted/20 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <div className="p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded">
                         <ShieldAlert className="h-4 w-4" /> 
                      </div>
                      Especialistas de Referência
                    </CardTitle>
                    <CardDescription>Acompanhamento e Monitoramento.</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-7 font-medium text-muted-foreground bg-background gap-2 px-3 border-border shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"/>
                    Meta: 25 casos (NOB/SUAS)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs uppercase tracking-wider font-semibold border-b border-border/60">
                      <TableHead className="w-[35%] pl-6 h-11 text-muted-foreground">Servidor</TableHead>
                      <TableHead className="w-[25%] h-11 text-muted-foreground">Ocupação</TableHead>
                      <TableHead className="text-center h-11 text-muted-foreground">Acompanhemnto</TableHead>
                      <TableHead className="text-center h-11 text-muted-foreground">Monitoramento</TableHead>
                      <TableHead className="text-right pr-6 h-11 text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                           <div className="flex flex-col items-center gap-3">
                             <div className="p-3 bg-muted/50 rounded-full">
                                <ShieldAlert className="h-6 w-6 opacity-30" />
                             </div>
                             <p>Nenhum especialista encontrado.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      specialists.map(member => (
                        <TeamRow key={member.id} member={member} maxLoad={25} onDetails={setSelectedUser} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}