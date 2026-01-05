// frontend/src/pages/TeamOverview.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  Eye, BarChart3, ArrowLeft, Briefcase, User 
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

interface TeamMemberStats {
  id: string
  name: string
  role: 'Especialista' | 'Agente_Social' | 'Gerente'
  active: number // PAEFI + Acolhida Esp
  monitoring: number // Monitoramento
}

export function TeamOverview() {
  const [selectedUser, setSelectedUser] = useState<TeamMemberStats | null>(null)

  const { data: teamStats, isLoading } = useQuery<TeamMemberStats[]>({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const res = await api.get('/stats/productivity')
      return res.data
    },
    staleTime: 1000 * 60 
  })

  // Se um usuário for selecionado, mostramos a lista detalhada
  if (selectedUser) {
    const filterParams = selectedUser.role === 'Agente_Social' 
      ? { agenteId: selectedUser.id }
      : { specialistId: selectedUser.id }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedUser(null)} className="h-8">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Equipe
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {selectedUser.name.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {selectedUser.name}
            </h2>
            <div className="flex gap-3 text-xs text-muted-foreground items-center mt-1">
              <Badge variant="secondary" className="font-normal">
                {selectedUser.role.replace('_', ' ')}
              </Badge>
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Ativos: <strong>{selectedUser.active}</strong>
              </span>
              {selectedUser.role === 'Especialista' && (
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" />
                  Monitoramento: <strong>{selectedUser.monitoring}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 border rounded-xl bg-card overflow-hidden">
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

  const specialists = teamStats?.filter(t => t.role === 'Especialista') || []
  const agents = teamStats?.filter(t => t.role === 'Agente_Social') || []

  // Componente de Linha da Tabela (Reutilizável)
  const TeamRow = ({ member, maxLoad }: { member: TeamMemberStats, maxLoad: number }) => {
    // Calculo de carga com peso reduzido para monitoramento (apenas visual)
    const weightedLoad = member.active + (member.monitoring * 0.2)
    const loadPercentage = Math.min((weightedLoad / maxLoad) * 100, 100)
    
    let progressColor = "bg-primary"
    if (loadPercentage >= 80) progressColor = "bg-amber-500" // Amarelo aos 20 casos (se max=25)
    if (loadPercentage >= 100) progressColor = "bg-destructive" // Vermelho aos 25 casos

    return (
      <TableRow key={member.id} className="group">
        <TableCell className="font-medium flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="text-xs text-muted-foreground bg-muted">
              {member.name.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-sm">{member.name}</div>
            <div className="text-[10px] text-muted-foreground">{member.role.replace('_', ' ')}</div>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="w-full max-w-[140px] space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Carga</span>
              <span>{Math.round(loadPercentage)}%</span>
            </div>
            <Progress value={loadPercentage} className="h-1.5" indicatorClassName={progressColor} />
          </div>
        </TableCell>

        <TableCell className="text-center">
          <Badge variant="outline" className="font-bold text-sm h-7 min-w-[2.5rem] justify-center border-primary/20 bg-primary/5 text-foreground">
            {member.active}
          </Badge>
        </TableCell>
        
        <TableCell className="text-center">
          {member.role === 'Especialista' ? (
            <span className="text-sm font-medium text-muted-foreground">{member.monitoring}</span>
          ) : (
            <span className="text-muted-foreground/30">-</span>
          )}
        </TableCell>

        <TableCell className="text-right">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedUser(member)}
            className="hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" /> Detalhes
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão da Equipe</h1>
          <p className="text-muted-foreground">Monitoramento de produtividade e distribuição de carga.</p>
        </div>
        <div className="flex gap-2">
           <Card className="px-4 py-2 flex flex-col items-center justify-center border-dashed bg-muted/30">
             <span className="text-[10px] uppercase text-muted-foreground font-bold">Total Ativos</span>
             <span className="text-xl font-bold text-primary">{teamStats?.reduce((a,b) => a + b.active, 0) || 0}</span>
           </Card>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="agents" className="gap-2">
              <User className="h-4 w-4" /> Acolhida
            </TabsTrigger>
            <TabsTrigger value="specialists" className="gap-2">
              <Briefcase className="h-4 w-4" /> Acompanhamento
            </TabsTrigger>
          </TabsList>

          {/* ABA ACOLHIDA (Agentes) */}
          <TabsContent value="agents" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Agentes Sociais
                </CardTitle>
                <CardDescription>Casos em Triagem e Acolhida Inicial.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Servidor</TableHead>
                      <TableHead>Volume Atual</TableHead>
                      <TableHead className="text-center">Triagem / Acolhida</TableHead>
                      <TableHead className="text-center">-</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum agente encontrado.</TableCell></TableRow>}
                    {/* Agentes não têm limite fixo de PAEFI, definimos 50 como referência visual */}
                    {agents.map(member => <TeamRow key={member.id} member={member} maxLoad={50} />)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA ACOMPANHAMENTO (Especialistas) */}
          <TabsContent value="specialists" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Especialistas
                </CardTitle>
                <CardDescription>Acompanhamento de casos PAEFI e Monitoramento.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Servidor</TableHead>
                      <TableHead>Capacidade (Ref. 25)</TableHead>
                      <TableHead className="text-center">Ativos (PAEFI)</TableHead>
                      <TableHead className="text-center">Monitoramento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialists.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum especialista encontrado.</TableCell></TableRow>}
                    {/* Carga máxima definida como 25 */}
                    {specialists.map(member => <TeamRow key={member.id} member={member} maxLoad={25} />)}
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