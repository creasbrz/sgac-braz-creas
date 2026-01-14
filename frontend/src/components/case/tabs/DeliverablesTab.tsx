import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  PackageCheck, Plus, Loader2, Clock, CheckCircle2, 
  XCircle, Truck, FileText, Gift, MoreHorizontal, AlertCircle 
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label'
import type { ServiceDeliverable } from '@/types/case'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// Categorização dos itens para facilitar a busca no Select
const CATEGORIAS_ENTREGA = {
  "Benefícios Assistenciais": [
    'Auxílio Natalidade',
    'Auxílio Calamidade',
    'Auxílio Vulnerabilidade',
    'Benefício Excepcional',
    'Prato Cheio',
    'Cesta de Alimentos',
    'Kit Enxoval'
  ],
  "Documentação Civil e Isenções": [
    'Declaração de Hipossuficiência',
    'Carteira do Idoso',
    'Isenção de RG',
    '2ª Via de Certidão',
    'Passe Livre (PCD)'
  ],
  "Encaminhamentos Externos": [
    'Encaminhamento para BPC',
    'Encaminhamento para Bolsa Família'
  ]
}

// Helper para ícones baseados no nome do benefício (UX Visual)
const getDeliverableIcon = (name: string) => {
  const docs = ['Declaração', 'Carteira', 'Isenção', 'Via', 'Passe', 'Encaminhamento']
  if (docs.some(d => name.includes(d))) return <FileText className="h-5 w-5 text-blue-500" />
  return <Gift className="h-5 w-5 text-amber-500" />
}

export function DeliverablesTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('')

  const { data: items = [], isLoading } = useQuery<ServiceDeliverable[]>({
    queryKey: ['deliverables', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/deliverables`)).data
  })

  // Ordenação: Pendentes primeiro, depois por data mais recente
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const statusWeight = { 'SOLICITADO': 3, 'CONCEDIDO': 2, 'ENTREGUE': 1, 'NEGADO': 0 }
      const weightA = statusWeight[a.status as keyof typeof statusWeight] || 0
      const weightB = statusWeight[b.status as keyof typeof statusWeight] || 0
      
      if (weightA !== weightB) return weightB - weightA
      return new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime()
    })
  }, [items])

  const { mutate: createItem, isPending } = useMutation({
    mutationFn: async () => api.post(`/cases/${caseId}/deliverables`, { tipo: selectedType }),
    onSuccess: () => {
      toast.success('Solicitação registrada!')
      setIsAddOpen(false)
      setSelectedType('')
      queryClient.invalidateQueries({ queryKey: ['deliverables', caseId] })
    },
    onError: () => toast.error('Erro ao registrar solicitação.')
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => 
      api.patch(`/deliverables/${id}`, { status, dataEntrega: status === 'ENTREGUE' ? new Date().toISOString() : undefined }),
    onSuccess: (_, variables) => {
      const msg = variables.status === 'ENTREGUE' ? 'Entrega confirmada!' : 'Status atualizado.'
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['deliverables', caseId] })
    },
    onError: () => toast.error('Erro ao atualizar status.')
  })

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string, icon: any, label: string }> = {
      'SOLICITADO': { color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', icon: Clock, label: 'Em Análise' },
      'CONCEDIDO': { color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', icon: CheckCircle2, label: 'Aprovado' },
      'ENTREGUE': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', icon: Truck, label: 'Entregue' },
      'NEGADO': { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Negado' },
    }
    
    const { color, icon: Icon, label } = config[status] || config['SOLICITADO']

    return (
      <Badge variant="outline" className={cn("gap-1.5 py-0.5 pr-2.5 pl-1.5 font-medium border shadow-none", color)}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header com Resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            Benefícios e Documentos
          </h3>
          <p className="text-sm text-muted-foreground">Histórico de concessões eventuais e encaminhamentos.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Solicitação
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
              <p className="text-sm">Carregando histórico...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
              <div className="bg-muted p-4 rounded-full mb-4">
                <PackageCheck className="h-8 w-8 opacity-50" />
              </div>
              <p className="font-medium text-foreground">Nenhum registro encontrado</p>
              <p className="text-sm max-w-sm mt-1 mb-4">Este caso ainda não possui solicitações de benefícios eventuais ou documentação.</p>
              <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)}>Criar o primeiro</Button>
            </div>
          ) : (
            <div className="divide-y">
              {sortedItems.map((item) => (
                <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4">
                  
                  {/* Coluna Esquerda: Ícone e Título */}
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 bg-muted/40 rounded-lg border shadow-sm shrink-0 group-hover:bg-background transition-colors">
                      {getDeliverableIcon(item.tipo)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{item.tipo}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> 
                          {format(new Date(item.dataSolicitacao), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span className="hidden sm:inline text-border">|</span>
                        
                        {/* [CORREÇÃO] Adicionado verificação segura para 'responsavel' */}
                        <span>Resp: {item.responsavel?.nome?.split(' ')[0] ?? '-'}</span>
                        
                        {item.dataEntrega && (
                          <>
                            <span className="hidden sm:inline text-border">|</span>
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> 
                              Entregue em {format(new Date(item.dataEntrega), "dd/MM")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Status e Ações */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-[3.25rem] sm:pl-0">
                    <StatusBadge status={item.status} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Atualizar Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateStatus({ id: item.id, status: 'SOLICITADO' })} disabled={item.status === 'SOLICITADO'}>
                          <Clock className="mr-2 h-4 w-4 text-amber-500" /> Marcar como Análise
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus({ id: item.id, status: 'CONCEDIDO' })} disabled={item.status === 'CONCEDIDO'}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" /> Aprovar (Conceder)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus({ id: item.id, status: 'ENTREGUE' })} disabled={item.status === 'ENTREGUE'}>
                          <Truck className="mr-2 h-4 w-4 text-emerald-500" /> Confirmar Entrega
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateStatus({ id: item.id, status: 'NEGADO' })} disabled={item.status === 'NEGADO'} className="text-destructive focus:text-destructive">
                          <XCircle className="mr-2 h-4 w-4" /> Negar Solicitação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Solicitação</DialogTitle>
            <DialogDescription>
              Registre a concessão de um benefício eventual ou solicitação de documento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Item</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(CATEGORIAS_ENTREGA).map(([categoria, itens]) => (
                    <SelectGroup key={categoria}>
                      <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {categoria}
                      </SelectLabel>
                      {itens.map(item => (
                        <SelectItem key={item} value={item} className="cursor-pointer">
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.8rem] text-muted-foreground flex items-center gap-1.5 mt-1.5">
                <AlertCircle className="h-3 w-3" />
                O item será criado com status inicial "Em Análise".
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => createItem()} disabled={!selectedType || isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4" />}
              Criar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}