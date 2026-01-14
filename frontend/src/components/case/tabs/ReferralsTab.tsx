import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Network, Plus, Calendar, CheckCircle2, Clock, XCircle, Trash2, 
  MoreHorizontal, Loader2, ArrowUpRight, AlertCircle, Check, ChevronsUpDown
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// Função utilitária para classes
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

interface Referral {
  id: string
  tipo: string
  instituicao: string
  motivo: string
  status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'
  dataEnvio: string
  retorno?: string
  autor: { nome: string }
}

const TIPOS_REDE = [
  "Saúde (SES/DF)", "Educação (SEEDF)", "Assistência Social (SEDES)",
  "Justiça & Direitos (MP/TJDFT)", "Conselho Tutelar", "Segurança Pública (PCDF/PMDF)",
  "Trabalho & Renda (SETEMP)", "Habitação (CODHAB)", "Transporte (Mobilidade)", "Outros"
]

// Base de dados de sugestões para Autocomplete
const SUGESTOES_POR_EIXO: Record<string, string[]> = {
  "Saúde (SES/DF)": [
    "Hospital Regional de Brazlândia (HRBz)",
    "UBS 01 - Vila São José",
    "UBS 02 - Vila São José",
    "UBS 03 - Veredas",
    "CAPS AD Brazlândia",
    "CAPS i (Infanto-Juvenil)",
    "Farmácia de Alto Custo"
  ],
  "Educação (SEEDF)": [
    "Coordenação Regional de Ensino (CRE Brazlândia)",
    "Escola Classe 01",
    "Escola Classe 02",
    "Centro de Ensino Médio 01 (CEM 01)",
    "CED 02 de Brazlândia",
    "Creche Jequitibá",
    "Escola Parque"
  ],
  "Assistência Social (SEDES)": [
    "CRAS Brazlândia",
    "CREAS Brazlândia",
    "Centro de Convivência (COSE)",
    "Restaurante Comunitário",
    "Unidade de Acolhimento para Adultos e Famílias (UNAF)"
  ],
  "Justiça & Direitos (MP/TJDFT)": [
    "Ministério Público (Promotoria de Justiça)",
    "Defensoria Pública do DF",
    "Fórum de Brazlândia",
    "NAFAVD (Núcleo de Atendimento à Família e Autores de Violência Doméstica)",
    "Pró-Vítima"
  ],
  "Conselho Tutelar": [
    "Conselho Tutelar de Brazlândia - I",
    "Conselho Tutelar de Brazlândia - II"
  ],
  "Segurança Pública (PCDF/PMDF)": [
    "18ª Delegacia de Polícia",
    "DEAM (Delegacia Especial de Atendimento à Mulher)",
    "Batalhão de Polícia Militar (16º BPM)",
    "PROVID (Policiamento de Prevenção Orientado à Violência Doméstica)"
  ],
  "Trabalho & Renda (SETEMP)": [
    "Agência do Trabalhador (Sine)",
    "Qualifica DF",
    "Renova DF"
  ],
  "Habitação (CODHAB)": [
    "CODHAB (Sede)",
    "Posto de Atendimento Na Hora"
  ]
}

export function ReferralsTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Estados do Form
  const [tipo, setTipo] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [motivo, setMotivo] = useState('')
  
  // Estado para o Combobox
  const [openCombobox, setOpenCombobox] = useState(false)

  // Memoiza as sugestões baseadas no tipo selecionado
  const sugestoesAtuais = useMemo(() => {
    return tipo ? (SUGESTOES_POR_EIXO[tipo] || []) : []
  }, [tipo])

  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ['referrals', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/referrals`)).data
  })

  const { mutate: addReferral, isPending } = useMutation({
    mutationFn: async () => {
      await api.post(`/cases/${caseId}/referrals`, { tipo, instituicao, motivo })
    },
    onSuccess: () => {
      toast.success("Encaminhamento registrado.")
      setIsAddOpen(false)
      setTipo(''); setInstituicao(''); setMotivo('')
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    },
    onError: () => toast.error("Erro ao registrar.")
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.patch(`/referrals/${id}`, { status })
    },
    onSuccess: () => {
      toast.success("Status atualizado.")
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    }
  })

  const { mutate: removeReferral } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/referrals/${id}`),
    onSuccess: () => {
      toast.success("Removido com sucesso.")
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    },
    onError: () => toast.error("Erro ao remover.")
  })

  // Renderização do Badge de Status
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      'CONCLUIDO': { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, text: 'Concluído' },
      'CANCELADO': { bg: 'bg-muted text-muted-foreground border-border', icon: XCircle, text: 'Cancelado' },
      'PENDENTE': { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, text: 'Pendente' }
    }
    const { bg, icon: Icon, text } = config[status as keyof typeof config] || config['PENDENTE']
    
    return (
      <Badge variant="outline" className={cn("gap-1 font-medium border", bg)}>
        <Icon className="w-3 h-3" /> {text}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Network className="h-5 w-5 text-primary" /> Articulação em Rede
          </h3>
          <p className="text-sm text-muted-foreground">Encaminhamentos intersetoriais e acompanhamento.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Encaminhamento
        </Button>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {isLoading && (
           <div className="col-span-full py-12 flex justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        )}
        
        {!isLoading && referrals.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5 border-2 border-dashed rounded-xl">
            <Network className="h-10 w-10 opacity-20 mb-3" />
            <p className="font-medium">Nenhum encaminhamento registrado</p>
            <p className="text-xs">Registre solicitações para a rede de proteção.</p>
          </div>
        )}

        {referrals.map((ref) => {
          const statusColors = {
            'PENDENTE': 'border-l-amber-500',
            'CONCLUIDO': 'border-l-emerald-500',
            'CANCELADO': 'border-l-muted-foreground'
          }
          const borderClass = statusColors[ref.status] || 'border-l-primary'

          return (
            <Card key={ref.id} className={cn("border-l-[4px] shadow-sm hover:shadow-md transition-shadow group", borderClass)}>
              <CardContent className="p-4 flex flex-col h-full gap-4">
                
                {/* Topo: Status e Metadados */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/50 mb-1">
                      {ref.tipo.split(' ')[0]}
                    </Badge>
                    <h4 className="font-bold text-base flex items-center gap-2 text-foreground">
                      {ref.instituicao}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                    </h4>
                  </div>
                  
                  {/* --- AQUI ESTAVA O ERRO --- */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {ref.status !== 'CONCLUIDO' && (
                         <DropdownMenuItem onClick={() => updateStatus({ id: ref.id, status: 'CONCLUIDO' })}>
                           <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Marcar Concluído
                         </DropdownMenuItem>
                      )}
                      {ref.status !== 'CANCELADO' && (
                        <DropdownMenuItem onClick={() => updateStatus({ id: ref.id, status: 'CANCELADO' })}>
                          <XCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Cancelar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => removeReferral(ref.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* --------------------------- */}
                </div>

                {/* Corpo: Motivo */}
                <div className="flex-1">
                   <div className="bg-muted/30 p-3 rounded-md border border-muted/50">
                      <p className="text-sm text-foreground/90 italic leading-relaxed">"{ref.motivo}"</p>
                   </div>
                   
                   {/* Retorno */}
                   {ref.retorno && (
                      <div className="mt-3 pl-3 border-l-2 border-emerald-300">
                         <p className="text-xs font-bold text-emerald-700 uppercase mb-0.5">Retorno</p>
                         <p className="text-sm text-foreground/80">{ref.retorno}</p>
                      </div>
                   )}
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-between pt-2 border-t mt-auto">
                   <div className="flex flex-col text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                         <Calendar className="h-3 w-3" /> {format(new Date(ref.dataEnvio), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span className="opacity-70">Por: {ref.autor?.nome.split(' ')[0]}</span>
                   </div>
                   <StatusBadge status={ref.status} />
                </div>

              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog Novo Encaminhamento */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Encaminhamento</DialogTitle>
            <DialogDescription>
              Registre uma articulação com a rede intersetorial.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rede / Setor</Label>
              <Select value={tipo} onValueChange={(val) => { setTipo(val); setInstituicao(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o eixo..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIPOS_REDE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Instituição de Destino</Label>
              
              {/* COMPONENTE DE AUTOCOMPLETE (COMBOBOX) */}
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal text-left"
                    disabled={!tipo}
                  >
                    {instituicao || <span className="text-muted-foreground">Selecione ou digite...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar instituição..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhuma instituição encontrada na lista.
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Sugestões Frequentes">
                        {sugestoesAtuais.map((item) => (
                          <CommandItem
                            key={item}
                            value={item}
                            onSelect={(currentValue) => {
                              setInstituicao(currentValue === instituicao ? "" : currentValue)
                              setOpenCombobox(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                instituicao === item ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="p-2 border-t bg-muted/20">
                     <p className="text-[10px] text-muted-foreground mb-1.5 px-1 font-semibold">OUTRA INSTITUIÇÃO (DIGITE ABAIXO):</p>
                     <input 
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Digite o nome manualmente..."
                        value={instituicao}
                        onChange={(e) => setInstituicao(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                     />
                  </div>
                </PopoverContent>
              </Popover>

              <p className="text-[10px] text-muted-foreground">
                 {sugestoesAtuais.length > 0 ? "Selecione da lista ou digite um novo local." : "Digite o nome do local manualmente."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo da Solicitação</Label>
              <Textarea 
                placeholder="Descreva a demanda, documentos necessários ou objetivo do encaminhamento..." 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
                rows={4}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                 <AlertCircle className="h-3 w-3" /> Seja breve e objetivo.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addReferral()} disabled={isPending || !instituicao || !motivo}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}