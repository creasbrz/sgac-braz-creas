// frontend/src/pages/GroupManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isFuture, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Users, Plus, MapPin, CalendarDays, Loader2, CheckSquare, 
  Search, SlidersHorizontal, Layers 
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

// Modals
import { CreateGroupModal } from '@/components/modals/CreateGroupModal'
import { GroupDetailsModal } from '@/components/modals/GroupDetailsModal'

import type { GroupActivity } from '@/types/group'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- SUB-COMPONENTE: CARD DE GRUPO ---
interface GroupCardProps {
  group: GroupActivity
  onSelect: (g: GroupActivity) => void
  onConfirm: (id: string) => void
  isConfirming: boolean
}

const GroupCard = ({ group, onSelect, onConfirm, isConfirming }: GroupCardProps) => {
  
  // Lógica de Status (Visual)
  const getStatusConfig = () => {
    if (group.attendanceConfirmed) {
      return { 
        color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
        indicator: "bg-emerald-500",
        label: 'Realizado'
      }
    }

    const date = new Date(group.dataRealizacao)
    const isFutureDate = isFuture(date) || isToday(date)
    
    if (isFutureDate) {
      return { 
        color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
        indicator: "bg-blue-500",
        label: 'Agendado'
      }
    }

    return { 
      color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
      indicator: "bg-amber-500",
      label: 'Pendente Chamada'
    }
  }

  const status = getStatusConfig()
  const isPending = status.label === 'Pendente Chamada'

  return (
    <Card 
      onClick={() => onSelect(group)}
      className="group relative flex flex-col justify-between overflow-hidden border shadow-sm transition-all hover:shadow-md hover:border-primary/40 cursor-pointer bg-card"
    >
      {/* Indicador Lateral de Status */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.indicator)} />

      <CardHeader className="pb-3 pt-4 pl-5 pr-4">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline" className={cn("text-[10px] font-medium px-2 py-0.5", status.color)}>
            {status.label}
          </Badge>
          
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-normal bg-muted text-muted-foreground">
            {group.tipo.replace(/_/g, ' ')}
          </Badge>
        </div>
        
        <CardTitle className="text-base font-bold leading-tight mt-3 line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
          {group.tema}
        </CardTitle>
      </CardHeader>

      <CardContent className="pl-5 pr-4 pb-2 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />
          <span className="capitalize">
            {format(new Date(group.dataRealizacao), "EEE, dd 'de' MMMM • HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 opacity-70 mt-0.5" />
          <span className="line-clamp-1" title={group.local}>
            {group.local || 'Local a definir'}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pl-5 pr-4 py-3 bg-muted/20 border-t flex items-center justify-between mt-auto">
        
        {/* Facilitador */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border border-background">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
              {group.facilitador.nome.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
            {group.facilitador.nome.split(' ')[0]}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Contador de Participantes */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Participantes">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{group._count?.participantes || 0}</span>
          </div>

          {/* Botão de Ação Rápida (Chamada) */}
          {isPending && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 hover:bg-amber-100 hover:text-amber-700 -mr-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      onConfirm(group.id)
                    }}
                    disabled={isConfirming}
                  >
                    {isConfirming ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckSquare className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Realizar Chamada</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

// --- MAIN COMPONENT ---
export function GroupManagement() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupActivity | null>(null)
  
  // [UX] Filtro simples local (pode evoluir para server-side)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: groups = [], isLoading } = useQuery<GroupActivity[]>({
    queryKey: ['groups'],
    queryFn: async () => (await api.get('/groups')).data
  })

  const { mutate: confirmGroup, isPending: isConfirming } = useMutation({
    mutationFn: async (groupId: string) => {
      await api.patch(`/groups/${groupId}/confirm`)
    },
    onSuccess: () => {
      toast.success('Atividade finalizada e presença confirmada!')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => toast.error('Erro ao finalizar atividade.')
  })

  // Filtragem local
  const filteredGroups = groups.filter(g => 
    g.tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.local?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Grupos e Oficinas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestão de atividades coletivas, planejamento e listas de presença.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nova Atividade
          </Button>
        </div>
      </div>

      {/* FILTROS E CONTROLES (Barra de Ferramentas) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-2 rounded-lg border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por tema ou local..." 
            className="pl-8 h-9 bg-background border-none shadow-sm focus-visible:ring-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>{filteredGroups.length} atividades encontradas</span>
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3 p-4 border rounded-xl h-[200px]">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 mt-4" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nenhuma atividade encontrada</h3>
            <p className="text-muted-foreground max-w-sm mt-1 mb-6 text-sm">
              Não encontramos grupos com os critérios de busca ou ainda não há atividades cadastradas.
            </p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
              Criar Primeira Atividade
            </Button>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <GroupCard 
              key={group.id} 
              group={group} 
              onSelect={setSelectedGroup} 
              onConfirm={confirmGroup}
              isConfirming={isConfirming}
            />
          ))
        )}
      </div>

      {/* MODALS */}
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