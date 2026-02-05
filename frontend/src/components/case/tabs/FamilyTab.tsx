// frontend/src/components/case/tabs/FamilyTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Users, PlusCircle, Trash2, Wallet, Briefcase, User, 
  Loader2, Calendar, MoreHorizontal, AlertCircle, ShieldAlert 
} from 'lucide-react'
import { IMaskInput } from 'react-imask'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDateSafe, formatCPF } from '@/utils/formatters'
import { OPTIONS } from '@/constants/options'

import type { FamilyMember } from '@/types/case'

// [NOVO] Prop para receber a renda do titular do componente pai
interface FamilyTabProps { 
  caseId: string;
  titularRenda?: number; // Opcional, vindo do CaseDetailData
}

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

const MaskedInput = ({ className, ...props }: any) => (
  <IMaskInput
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
)

export function FamilyTab({ caseId, titularRenda = 0 }: FamilyTabProps) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Form States
  const [nome, setNome] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [idade, setIdade] = useState('')
  const [ocupacao, setOcupacao] = useState('')
  const [renda, setRenda] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [violacoes, setViolacoes] = useState<string[]>([])

  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/family`)).data
  })

  const { mutate: addMember, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      await api.post(`/cases/${caseId}/family`, {
        nome, parentesco, ocupacao, cpf: cpf || null, nascimento: nascimento || null, telefone: telefone || null,
        idade: idade ? parseInt(idade) : undefined,
        renda: renda ? parseFloat(renda.replace(',', '.')) : undefined,
        violacao: violacoes
      })
    },
    onSuccess: () => {
      toast.success("Familiar adicionado.")
      setIsAddOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
      // [IMPORTANTE] Invalidar o caso principal para atualizar a renda per capita global se ela estivesse lá
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
    onError: () => toast.error("Erro ao adicionar.")
  })

  const { mutate: removeMember } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/family/${id}`),
    onSuccess: () => {
      toast.success("Familiar removido.")
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    }
  })

  const resetForm = () => {
    setNome(''); setParentesco(''); setIdade(''); setOcupacao(''); setRenda('')
    setCpf(''); setNascimento(''); setTelefone(''); setViolacoes([])
  }

  const handleViolationChange = (v: string, checked: boolean) => {
    if (checked) setViolacoes(prev => [...prev, v])
    else setViolacoes(prev => prev.filter(item => item !== v))
  }

  // --- CÁLCULO DE RENDA DINÂMICO (FRONTEND) ---
  const rendaFamiliares = members.reduce((acc, m) => acc + (Number(m.renda) || 0), 0)
  
  // Total = Titular + Familiares
  const rendaTotal = Number(titularRenda) + rendaFamiliares
  
  // Pessoas = 1 (Titular) + N (Familiares)
  const totalPessoas = 1 + members.length
  
  const perCapita = totalPessoas > 0 ? rendaTotal / totalPessoas : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header e Métricas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" /> Composição Familiar
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de vínculos e cálculo de renda per capita (incluindo titular).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
           <div className="flex items-center gap-6 text-sm bg-background p-2.5 px-5 rounded-xl border shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Renda Total</span>
              <span className="font-bold text-status-success-fg text-base">
                {rendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Per Capita ({totalPessoas} pessoas)</span>
              <span className="font-medium text-base text-foreground">
                {perCapita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
          
          <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto shadow-sm font-semibold">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {isLoading && (
           <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
             <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
             <p className="text-sm uppercase tracking-widest">Carregando família...</p>
           </div>
        )}

        {!isLoading && members.length === 0 && (
           <div className="p-16 text-center flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
             <div className="bg-muted p-4 rounded-full mb-4 border border-border/50">
                <Users className="h-8 w-8 opacity-50" />
             </div>
             <h3 className="font-bold text-foreground">Apenas o titular cadastrado</h3>
             <p className="text-sm max-w-sm mt-1 mb-4 opacity-80">Adicione outros membros para compor o cálculo familiar.</p>
             <Button variant="outline" onClick={() => setIsAddOpen(true)}>Adicionar Familiar</Button>
           </div>
        )}

        {!isLoading && members.length > 0 && (
          <div className="w-full">
            <div className="overflow-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-62.5 font-semibold text-muted-foreground">Membro</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Vínculo</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Dados Pessoais</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Ocupação</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Violações (RMA)</TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground">Renda</TableHead>
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                             {m.nome.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex flex-col">
                             <span className="font-medium text-foreground">{m.nome}</span>
                             {m.cpf && <span className="text-xs text-muted-foreground font-mono">{formatCPF(m.cpf)}</span>}
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium bg-muted text-muted-foreground hover:bg-muted border-border/50">{m.parentesco}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-muted-foreground">
                          {m.nascimento ? (
                            <span className="flex items-center gap-1.5">
                               <Calendar className="h-3.5 w-3.5 opacity-70" /> {formatDateSafe(m.nascimento)}
                            </span>
                          ) : (
                             <span className="text-xs italic opacity-60">Sem data nasc.</span>
                          )}
                          <span className="text-xs pl-5 opacity-80">{m.idade ? `${m.idade} anos` : '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.ocupacao ? (
                          <span className="text-sm font-medium text-foreground/80">{m.ocupacao}</span>
                        ) : <span className="text-muted-foreground/40 text-xs">-</span>}
                      </TableCell>
                      <TableCell>
                        {(m.violacao && m.violacao.length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {m.violacao.slice(0, 2).map((v: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] h-5 border-status-error-border bg-status-error-bg text-status-error-fg">{v}</Badge>
                            ))}
                            {m.violacao.length > 2 && <Badge variant="outline" className="text-[10px] h-5 bg-muted text-muted-foreground">+{m.violacao.length - 2}</Badge>}
                          </div>
                        ) : <span className="text-muted-foreground/40 text-xs italic">Nenhuma</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {Number(m.renda) > 0 ? (
                           <span className="text-status-success-fg bg-status-success-bg px-1.5 py-0.5 rounded border border-status-success-border/50">
                             {Number(m.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        ) : <span className="text-muted-foreground opacity-50">-</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background hover:shadow-sm">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => removeMember(m.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Adicionar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-background p-0 gap-0 border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10">
            <DialogTitle className="flex items-center gap-2">
               <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20"><Users className="h-4 w-4 text-primary"/></div>
               Adicionar Familiar
            </DialogTitle>
            <DialogDescription>Preencha os dados do membro para compor o núcleo familiar.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 p-6">
            {/* Seção 1: Identificação */}
            <div className="space-y-4">
               <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-1">
                  <User className="h-3.5 w-3.5" /> Identificação
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo <span className="text-status-error-fg">*</span></Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do familiar" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Parentesco <span className="text-status-error-fg">*</span></Label>
                    <Select value={parentesco} onValueChange={setParentesco}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mãe">Mãe</SelectItem>
                        <SelectItem value="Pai">Pai</SelectItem>
                        <SelectItem value="Filho(a)">Filho(a)</SelectItem>
                        <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                        <SelectItem value="Irmão(ã)">Irmão(ã)</SelectItem>
                        <SelectItem value="Avô(ó)">Avô(ó)</SelectItem>
                        <SelectItem value="Tio(a)">Tio(a)</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <MaskedInput mask="000.000.000-00" value={cpf} onAccept={(v: string) => setCpf(v)} placeholder="000.000.000-00" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Nascimento</Label>
                    <Input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} className="bg-background" />
                  </div>
               </div>
            </div>

            {/* Seção 2: Sócio-econômico */}
            <div className="space-y-4">
               <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-1">
                  <Briefcase className="h-3.5 w-3.5" /> Dados Sócio-econômicos
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ocupação</Label>
                    <Select value={ocupacao} onValueChange={setOcupacao}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {OPTIONS.ocupacao.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Renda Mensal (R$)</Label>
                    <div className="relative">
                      <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9 bg-background" type="number" value={renda} onChange={e => setRenda(e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <MaskedInput mask="(00) 00000-0000" value={telefone} onAccept={(v: string) => setTelefone(v)} placeholder="(00) 00000-0000" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 cursor-help" title="Preencher apenas se não souber a data de nascimento">
                      Idade <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <Input type="number" value={idade} onChange={e => setIdade(e.target.value)} placeholder="Aprox." disabled={!!nascimento} className="bg-background" />
                  </div>
               </div>
            </div>

            {/* Seção 3: Violações (RMA B.6) */}
            <div className="space-y-3">
               <h4 className="text-xs font-bold uppercase text-status-error-fg flex items-center gap-2 border-b border-status-error-border/50 pb-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Violações de Direitos (Se houver)
               </h4>
               <ScrollArea className="h-30 rounded-md border border-status-error-border/30 p-3 bg-status-error-bg/10">
                 <div className="grid grid-cols-1 gap-2.5">
                   {OPTIONS.violacao.map(v => (
                     <div key={v} className="flex items-center space-x-2.5">
                       <Checkbox 
                         id={`v-${v}`} 
                         checked={violacoes.includes(v)}
                         onCheckedChange={(c) => handleViolationChange(v, c as boolean)}
                         className="data-[state=checked]:bg-status-error-fg data-[state=checked]:border-status-error-fg"
                       />
                       <label htmlFor={`v-${v}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/90">
                         {v}
                       </label>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/10 border-t border-border/40">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="hover:bg-muted/50">Cancelar</Button>
            <Button onClick={() => addMember()} disabled={!nome || !parentesco || isAdding} className="shadow-sm font-semibold">
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Familiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}