// frontend/src/pages/GroupManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, isFuture, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Users, Plus, MapPin, CalendarDays, Loader2, CheckSquare, 
  Search, SlidersHorizontal, Layers} from 'lucide-react'
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
  
  // Lógica de Status (Visual Modernizado)
  const getStatusConfig = () => {
    if (group.attendanceConfirmed) {
      return { 
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        indicator: "bg-emerald-500",
        label: 'Realizado'
      }
    }

    const date = new Date(group.dataRealizacao)
    const isFutureDate = isFuture(date) || isToday(date)
    
    if (isFutureDate) {
      return { 
        badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        indicator: "bg-blue-500",
        label: 'Agendado'
      }
    }

    return { 
      badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
      indicator: "bg-amber-500",
      label: 'Pendente Chamada'
    }
  }

  const status = getStatusConfig()
  const isPending = status.label === 'Pendente Chamada'

  return (
    <Card 
      onClick={() => onSelect(group)}
      className="group relative flex flex-col justify-between overflow-hidden border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50 cursor-pointer h-full"
    >
      {/* Indicador Lateral de Status */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 transition-colors", status.indicator)} />

      <CardHeader className="pb-3 pt-4 pl-5 pr-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5 shadow-none", status.badge)}>
            {status.label}
          </Badge>
          
          <div className="flex items-center gap-2">
             <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-medium bg-muted text-muted-foreground border-border/50">
               {group.tipo.replace(/_/g, ' ')}
             </Badge>
          </div>
        </div>
        
        <CardTitle className="text-base font-bold leading-tight line-clamp-2 min-h-10 group-hover:text-primary transition-colors">
          {group.tema}
        </CardTitle>
      </CardHeader>

      <CardContent className="pl-5 pr-4 pb-4 space-y-3 flex-1">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground/70" />
          <span className="capitalize font-medium text-foreground/80">
            {format(new Date(group.dataRealizacao), "EEE, dd 'de' MMM • HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70 mt-0.5" />
          <span className="line-clamp-1" title={group.local}>
            {group.local || 'Local a definir'}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pl-5 pr-4 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between mt-auto">
        
        {/* Facilitador */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border border-background shadow-sm">
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
              {group.facilitador.nome.substring(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-25">
            {group.facilitador.nome.split(' ')[0]}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Contador de Participantes */}
          <TooltipProvider>
            <Tooltip>
               <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50 shadow-sm">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-semibold">{group._count?.participantes || 0}</span>
                  </div>
               </TooltipTrigger>
               <TooltipContent>Participantes Inscritos</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Botão de Ação Rápida (Chamada) */}
          {isPending && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 -mr-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onConfirm(group.id)
                    }}
                    disabled={isConfirming}
                  >
                    {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <CheckSquare className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-semibold text-amber-600 bg-amber-50 border-amber-200">
                   Confirmar Realização
                </TooltipContent>
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
  
  // Filtro local
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10 max-w-400 mx-auto p-6">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
             <Users className="h-8 w-8 text-primary/80" /> Grupos e Oficinas
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
             Gestão completa de atividades coletivas, planejamento de pautas e controle de frequência dos participantes.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="shadow-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto h-10"
          >
            <Plus className="h-4 w-4" /> Nova Atividade
          </Button>
        </div>
      </div>

      {/* FILTROS E CONTROLES (Barra de Ferramentas) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-1.5 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar por tema, local ou facilitador..." 
            className="pl-9 h-10 bg-background border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground px-4 py-2 sm:py-0 w-full sm:w-auto justify-between sm:justify-end bg-background sm:bg-transparent rounded-lg border sm:border-none border-border">
          <div className="flex items-center gap-2">
             <SlidersHorizontal className="h-4 w-4" />
             <span className="font-medium">Total:</span>
          </div>
          <Badge variant="secondary" className="font-mono font-bold">
             {filteredGroups.length}
          </Badge>
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col border border-border rounded-xl h-55 bg-card overflow-hidden">
               <div className="p-5 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
               </div>
               <div className="mt-auto p-4 bg-muted/20 border-t border-border flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-12 rounded-md" />
               </div>
            </div>
          ))
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/5 animate-in fade-in zoom-in-95">
            <div className="bg-muted/50 p-6 rounded-full mb-4 ring-1 ring-border">
              <Layers className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nenhuma atividade encontrada</h3>
            <p className="text-muted-foreground max-w-md mt-2 mb-8 text-sm leading-relaxed">
              Não encontramos grupos com os critérios de busca atuais ou ainda não há atividades cadastradas no sistema.
            </p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Primeira Atividade
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