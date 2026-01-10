// frontend/src/pages/GroupManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isFuture, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Plus, MapPin, CalendarDays, Loader2, CheckSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from 'sonner'

// Imports dos novos modais
import { CreateGroupModal } from '@/components/modals/CreateGroupModal'
import { GroupDetailsModal } from '@/components/modals/GroupDetailsModal'

import type { GroupActivity } from '@/types/group'

export function GroupManagement() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupActivity | null>(null)

  const { data: groups = [], isLoading } = useQuery<GroupActivity[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data
  })

  // Mutação para Finalizar/Confirmar a Atividade
  const { mutate: confirmGroup, isPending: isConfirming } = useMutation({
    mutationFn: async (groupId: string) => {
      await api.patch(`/groups/${groupId}/confirm`)
    },
    onSuccess: () => {
      toast.success('Atividade finalizada e confirmada!')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => toast.error('Erro ao finalizar atividade.')
  })

  // Lógica de cores
  const getGroupStatusColor = (group: GroupActivity) => {
    if (group.attendanceConfirmed) {
      return { 
        border: 'bg-emerald-500', 
        bg: 'hover:border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50', 
        badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
        label: 'Realizado'
      }
    }

    const date = new Date(group.dataRealizacao)
    const isFutureDate = isFuture(date) || isToday(date)
    
    if (isFutureDate) {
      return { 
        border: 'bg-blue-500', 
        bg: 'hover:border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50', 
        badge: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
        label: 'Agendado'
      }
    }

    return { 
      border: 'bg-amber-500', 
      bg: 'hover:border-amber-300 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50', 
      badge: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
      label: 'Pendente Chamada'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos e Oficinas</h1>
          <p className="text-muted-foreground">Gestão de atividades coletivas e lista de presença.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && <div className="col-span-3 text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/></div>}
        
        {groups.map((group) => {
          const statusStyle = getGroupStatusColor(group)
          const isPending = statusStyle.label === 'Pendente Chamada'

          return (
            <Card key={group.id} className={`cursor-pointer transition-all group overflow-hidden border ${statusStyle.bg}`} onClick={() => setSelectedGroup(group)}>
              
              <div className={`h-2 ${statusStyle.border} w-full`} />
              
              <CardHeader className="pb-3 pt-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-background text-[10px] font-normal uppercase tracking-wider">
                      {group.tipo.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] font-medium border ${statusStyle.badge}`}>
                        {statusStyle.label}
                    </Badge>
                  </div>

                  {/* BOTÃO DE CONFIRMAR CHAMADA (Aparece se estiver pendente) */}
                  {isPending && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 -mt-1 hover:bg-emerald-100 hover:text-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              confirmGroup(group.id)
                            }}
                            disabled={isConfirming}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Finalizar e Confirmar Chamada</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <CardTitle className="text-lg leading-tight line-clamp-2 min-h-[3rem] text-foreground/90">
                 {group.tema}
                </CardTitle>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(group.dataRealizacao), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/40 dark:bg-muted/10 p-2 rounded-md">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" /> 
                        <span className="truncate leading-tight">{group.local || 'Local não definido'}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{group.local}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t dark:border-white/10">
                  <span className="truncate max-w-[140px] font-medium text-foreground/80">
                    Facilitador: {group.facilitador.nome.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full text-primary font-medium">
                    <Users className="h-3.5 w-3.5"/> 
                    <span>{group._count?.participantes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modais */}
      <CreateGroupModal 
        isOpen={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />

      <GroupDetailsModal 
        group={selectedGroup} 
        isOpen={!!selectedGroup} 
        onOpenChange={(open) => !open && setSelectedGroup(null)} 
      />
    </div>
  )
}