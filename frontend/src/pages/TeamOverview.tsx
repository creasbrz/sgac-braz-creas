import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Eye, BarChart3, ArrowLeft, Briefcase, User, ShieldAlert, Lock 
} from 'lucide-react'

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

interface TeamMemberStats {
  id: string
  name: string
  role: 'Especialista' | 'Agente_Social' | 'Gerente'
  active: number // PAEFI + Acolhida Esp
  monitoring: number // Monitoramento
}

// --- SUBCOMPONENTE: LINHA DA TABELA ---
const TeamRow = ({ member, maxLoad, onDetails }: { member: TeamMemberStats, maxLoad: number, onDetails: (m: TeamMemberStats) => void }) => {
  // Cálculo de carga ponderada (Monitoramento pesa menos)
  const weightedLoad = member.active + (member.monitoring * 0.2)
  const loadPercentage = Math.min((weightedLoad / maxLoad) * 100, 100)
  
  let progressColor = "bg-primary"
  if (loadPercentage >= 80) progressColor = "bg-amber-500" // Alerta
  if (loadPercentage >= 100) progressColor = "bg-destructive" // Crítico

  return (
    <TableRow className="group hover:bg-muted/5 transition-colors">
      <TableCell className="font-medium flex items-center gap-3">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="text-xs text-muted-foreground bg-muted font-semibold">
            {member.name.substring(0,2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold text-sm text-foreground">{member.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.role.replace('_', ' ')}</div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="w-full max-w-[140px] space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>Ocupação</span>
            <span>{Math.round(loadPercentage)}%</span>
          </div>
          <Progress value={loadPercentage} className="h-1.5 bg-secondary" indicatorClassName={progressColor} />
        </div>
      </TableCell>

      <TableCell className="text-center">
        <Badge variant="outline" className="font-bold text-sm h-7 min-w-[2.5rem] justify-center border-primary/20 bg-primary/5 text-foreground tabular-nums">
          {member.active}
        </Badge>
      </TableCell>
      
      <TableCell className="text-center">
        {member.role === 'Especialista' ? (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{member.monitoring}</span>
        ) : (
          <span className="text-muted-foreground/30 select-none">-</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDetails(member)}
          className="hover:bg-primary/10 hover:text-primary transition-colors h-8 px-2"
        >
          <Eye className="h-4 w-4 mr-2" /> Detalhes
        </Button>
      </TableCell>
    </TableRow>
  )
}

// --- SUBCOMPONENTE: VISÃO DETALHADA ---
const TeamDetailView = ({ member, onBack }: { member: TeamMemberStats, onBack: () => void }) => {
  const filterParams = member.role === 'Agente_Social' 
    ? { agenteId: member.id }
    : { specialistId: member.id }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="ghost" onClick={onBack} className="h-8 px-2 hover:bg-muted/80">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Equipe
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {member.name.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {member.name}
          </h2>
          <div className="flex gap-4 text-xs text-muted-foreground items-center mt-1.5 pl-1">
            <Badge variant="secondary" className="font-normal border-border bg-muted">
              {member.role.replace('_', ' ')}
            </Badge>
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
              Ativos: <strong className="text-foreground">{member.active}</strong>
            </span>
            {member.role === 'Especialista' && (
              <span className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-sm" />
                Monitoramento: <strong className="text-foreground">{member.monitoring}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-xl bg-card overflow-hidden shadow-sm">
        <CaseTable 
          endpoint="/cases"
          title=""
          description=""
          defaultView="all"
          extraParams={filterParams}
        />
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function TeamOverview() {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState<TeamMemberStats | null>(null)

  const { data: teamStats, isLoading } = useQuery<TeamMemberStats[]>({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const res = await api.get('/stats/productivity')
      return res.data
    },
    enabled: !!user, // Só busca se houver usuário
    staleTime: 1000 * 60 
  })

  // Bloqueio de Acesso Institucional
  if (user?.cargo !== 'Gerente') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="p-4 bg-destructive/10 rounded-full border border-destructive/20">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            O módulo de gestão de equipe é exclusivo para o perfil de Gerência.
          </p>
        </div>
      </div>
    )
  }

  // Visão Detalhada (Drill-down)
  if (selectedUser) {
    return <TeamDetailView member={selectedUser} onBack={() => setSelectedUser(null)} />
  }

  const specialists = teamStats?.filter(t => t.role === 'Especialista') || []
  const agents = teamStats?.filter(t => t.role === 'Agente_Social') || []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão da Equipe</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento de carga de trabalho e distribuição de casos.</p>
        </div>
        
        {/* KPI Rápido */}
        <div className="flex items-center gap-3 bg-muted/40 p-2 pr-4 rounded-lg border shadow-sm">
           <div className="p-2 bg-primary/10 rounded-md text-primary">
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
        <div className="space-y-6 p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/50 p-1">
            <TabsTrigger value="agents" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4" /> Acolhida (Agentes)
            </TabsTrigger>
            <TabsTrigger value="specialists" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" /> PAEFI (Técnicos)
            </TabsTrigger>
          </TabsList>

          {/* ABA ACOLHIDA (Agentes) */}
          <TabsContent value="agents" className="mt-6 space-y-4 focus-visible:outline-none">
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b bg-muted/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Agentes Sociais
                    </CardTitle>
                    <CardDescription>Fluxo de Triagem e Acolhida Inicial.</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-normal text-muted-foreground bg-background">
                    Ref. Carga: 50
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs uppercase tracking-wider">
                      <TableHead className="w-[300px]">Servidor</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead className="text-center">Vol. Atual</TableHead>
                      <TableHead className="text-center">-</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum agente encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {agents.map(member => (
                      <TeamRow key={member.id} member={member} maxLoad={50} onDetails={setSelectedUser} />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA ACOMPANHAMENTO (Especialistas) */}
          <TabsContent value="specialists" className="mt-6 space-y-4 focus-visible:outline-none">
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b bg-muted/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-primary" /> Especialistas de Referência
                    </CardTitle>
                    <CardDescription>Acompanhamento Sistemático (PAEFI) e Monitoramento.</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-normal text-muted-foreground bg-background">
                    Ref. Carga: 25 (NOB/SUAS)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs uppercase tracking-wider">
                      <TableHead className="w-[300px]">Servidor</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead className="text-center">Ativos (PAEFI)</TableHead>
                      <TableHead className="text-center">Monitoramento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialists.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum especialista encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {specialists.map(member => (
                      <TeamRow key={member.id} member={member} maxLoad={25} onDetails={setSelectedUser} />
                    ))}
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