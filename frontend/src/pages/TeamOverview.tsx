// frontend/src/pages/TeamOverview.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Eye, ArrowLeft, Briefcase, ShieldAlert, Lock, UserCheck 
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
import { useAuth } from '@/hooks/useAuth'
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
  
  // Cores Semânticas de Carga
  let progressColor = "bg-emerald-500" // Saudável
  let statusText = "Normal"
  if (loadPercentage >= 80) { progressColor = "bg-amber-500"; statusText = "Alta" } 
  if (loadPercentage >= 100) { progressColor = "bg-destructive"; statusText = "Crítica" }

  return (
    <TableRow className="group hover:bg-muted/30 transition-colors">
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/50">
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
        <div className="w-full max-w-[160px] space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground">
            <span className={cn(
               loadPercentage >= 100 ? "text-destructive font-bold" : 
               loadPercentage >= 80 ? "text-amber-600 dark:text-amber-400" : ""
            )}>
              {statusText} ({Math.round(loadPercentage)}%)
            </span>
            <span className="tabular-nums opacity-70">{member.active + (member.monitoring * 0.2)} / {maxLoad} un.</span>
          </div>
          <Progress value={loadPercentage} className="h-1.5 bg-secondary" indicatorClassName={progressColor} />
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold tabular-nums border border-blue-100 dark:border-blue-900">
          {member.active}
        </div>
      </TableCell>
      
      <TableCell className="text-center">
        {member.role === 'Especialista' ? (
          <div className="inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs font-bold tabular-nums border border-cyan-100 dark:border-cyan-900">
            {member.monitoring}
          </div>
        ) : (
          <span className="text-muted-foreground/20 select-none">-</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDetails(member)}
          className="h-8 px-3 hover:bg-primary/10 hover:text-primary transition-colors font-medium text-xs gap-2"
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
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      {/* Header do Perfil */}
      <div className="flex flex-col gap-4 border-b pb-6">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground">
             <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
           </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                <AvatarFallback className={cn("bg-primary/10 text-primary text-lg font-bold", isPrivacyMode && "blur-[3px]")}>
                  {member.name.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                 <h2 className={cn("text-2xl font-bold tracking-tight", isPrivacyMode && "blur-[6px] select-none")}>
                   {member.name}
                 </h2>
                 <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal text-muted-foreground border-border">
                      {member.role.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• ID: {member.id.substring(0,8)}</span>
                 </div>
              </div>
           </div>

           <div className="flex gap-3">
              <Card className="flex flex-col items-center justify-center p-3 min-w-[100px] border-l-4 border-l-blue-500 shadow-sm">
                 <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Ativos</span>
                 <span className="text-2xl font-bold text-foreground tabular-nums">{member.active}</span>
              </Card>
              {member.role === 'Especialista' && (
                <Card className="flex flex-col items-center justify-center p-3 min-w-[100px] border-l-4 border-l-cyan-500 shadow-sm">
                   <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Monit.</span>
                   <span className="text-2xl font-bold text-foreground tabular-nums">{member.monitoring}</span>
                </Card>
              )}
           </div>
        </div>
      </div>

      <div className="flex-1 bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
           <h3 className="font-semibold flex items-center gap-2">
             <Briefcase className="h-4 w-4 text-primary"/> Casos Vinculados
           </h3>
        </div>
        <div className="flex-1 min-h-0">
           <CaseTable 
             endpoint="/cases"
             title=""
             description=""
             defaultView="all"
             queryParams={filterParams}
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
  if (user?.cargo !== 'Gerente' && user?.cargo !== 'Auditor') { // Auditor também pode ver (conforme navigation.ts)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="p-4 bg-destructive/10 rounded-full border border-destructive/20">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            O módulo de gestão de equipe é exclusivo para Gerência e Auditoria.
          </p>
        </div>
      </div>
    )
  }

  if (selectedUser) {
    return <TeamDetailView member={selectedUser} onBack={() => setSelectedUser(null)} />
  }

  const specialists = teamStats?.filter(t => t.role === 'Especialista') || []
  const agents = teamStats?.filter(t => t.role === 'Agente_Social') || []

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão da Equipe</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitoramento de carga de trabalho e distribuição de casos.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl border shadow-sm">
           <div className="p-2 bg-primary/10 rounded-lg text-primary">
             <Briefcase className="h-5 w-5" />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Total em Atendimento</span>
             <span className="text-xl font-bold text-foreground leading-none tabular-nums">
               {teamStats?.reduce((a,b) => a + b.active, 0) || 0}
             </span>
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 p-1">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card><div className="p-6 space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full"/>)}</div></Card>
        </div>
      ) : (
        <Tabs defaultValue="agents" className="w-full">
          <div className="flex items-center justify-between mb-4">
             <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/50 p-1">
               <TabsTrigger value="agents" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                 <UserCheck className="h-4 w-4" /> Agentes
               </TabsTrigger>
               <TabsTrigger value="specialists" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                 <ShieldAlert className="h-4 w-4" /> Especialistas
               </TabsTrigger>
             </TabsList>
          </div>

          {/* TAB AGENTES */}
          <TabsContent value="agents" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-left-2 duration-300">
            <Card className="shadow-sm border-border bg-card">
              <CardHeader className="pb-3 border-b bg-muted/10 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-blue-600" /> Agentes Sociais
                    </CardTitle>
                    <CardDescription>Responsáveis pela triagem e acolhida inicial.</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-6 font-normal text-muted-foreground bg-background gap-1.5 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"/>
                    Meta: 50 casos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs uppercase tracking-wider">
                      <TableHead className="w-[35%] pl-6 h-10">Servidor</TableHead>
                      <TableHead className="w-[25%] h-10">Ocupação</TableHead>
                      <TableHead className="text-center h-10">Ativos</TableHead>
                      <TableHead className="text-center h-10">-</TableHead>
                      <TableHead className="text-right pr-6 h-10">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum agente encontrado.
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
            <Card className="shadow-sm border-border bg-card">
              <CardHeader className="pb-3 border-b bg-muted/10 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-purple-600" /> Especialistas de Referência
                    </CardTitle>
                    <CardDescription>Acompanhamento PAEFI e Monitoramento.</CardDescription>
                  </div>
                  <Badge variant="outline" className="h-6 font-normal text-muted-foreground bg-background gap-1.5 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500"/>
                    Meta: 25 casos (NOB/SUAS)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs uppercase tracking-wider">
                      <TableHead className="w-[35%] pl-6 h-10">Servidor</TableHead>
                      <TableHead className="w-[25%] h-10">Ocupação</TableHead>
                      <TableHead className="text-center h-10">PAEFI</TableHead>
                      <TableHead className="text-center h-10">Monitoramento</TableHead>
                      <TableHead className="text-right pr-6 h-10">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum especialista encontrado.
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