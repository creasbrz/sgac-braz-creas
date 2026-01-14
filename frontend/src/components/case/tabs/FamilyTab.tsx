import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Users, PlusCircle, Trash2, Wallet, Briefcase, User, Phone, 
  Loader2, Calendar, MoreHorizontal, AlertCircle 
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
import { formatDateSafe, formatCPF, formatPhone } from '@/utils/formatters'

import type { FamilyMember } from '@/types/case'

interface FamilyTabProps { caseId: string }

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

// Componente de Input com Máscara estilizado como Shadcn
const MaskedInput = ({ className, ...props }: any) => (
  <IMaskInput
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
)

export function FamilyTab({ caseId }: FamilyTabProps) {
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
      })
    },
    onSuccess: () => {
      toast.success("Familiar adicionado.")
      setIsAddOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
    },
    onError: () => toast.error("Erro ao adicionar.")
  })

  const { mutate: removeMember } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/family/${id}`),
    onSuccess: () => {
      toast.success("Familiar removido.")
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
    }
  })

  const resetForm = () => {
    setNome(''); setParentesco(''); setIdade(''); setOcupacao(''); setRenda('')
    setCpf(''); setNascimento(''); setTelefone('')
  }

  const totalRenda = members.reduce((acc, m) => acc + (Number(m.renda) || 0), 0)
  const perCapita = members.length > 0 ? totalRenda / members.length : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header e Métricas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/20 p-4 rounded-xl border">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" /> Composição Familiar
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de vínculos e cálculo de renda per capita.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
           <div className="flex items-center gap-6 text-sm bg-background p-2 px-4 rounded-lg border shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Renda Total</span>
              <span className="font-bold text-emerald-600 text-base">
                {totalRenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Per Capita</span>
              <span className="font-medium text-base text-foreground">
                {perCapita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
          
          <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
          </Button>
        </div>
      </div>

      {/* Tabela (Desktop) e Lista (Mobile) */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        
        {/* Loading State */}
        {isLoading && (
           <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
              <p>Carregando família...</p>
           </div>
        )}

        {/* Empty State */}
        {!isLoading && members.length === 0 && (
           <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
              <div className="bg-muted p-4 rounded-full mb-4">
                 <Users className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="font-medium text-foreground">Nenhum familiar cadastrado</h3>
              <p className="text-sm max-w-sm mt-1 mb-4">Adicione as pessoas que compõem o núcleo familiar para cálculo de renda e gestão.</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)}>Adicionar o primeiro</Button>
           </div>
        )}

        {/* Lista de Membros */}
        {!isLoading && members.length > 0 && (
          <div className="w-full">
            {/* Versão Desktop: Tabela */}
            <div className="hidden md:block overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[250px]">Membro</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Dados Pessoais</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Ocupação</TableHead>
                    <TableHead className="text-right">Renda</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {m.nome.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex flex-col">
                             <span className="font-medium text-foreground">{m.nome}</span>
                             {m.cpf && <span className="text-xs text-muted-foreground font-mono">{formatCPF(m.cpf)}</span>}
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-muted text-muted-foreground hover:bg-muted">{m.parentesco}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-muted-foreground">
                          {m.nascimento ? (
                            <span className="flex items-center gap-1.5">
                               <Calendar className="h-3.5 w-3.5 opacity-70" /> {formatDateSafe(m.nascimento)}
                            </span>
                          ) : (
                             <span className="text-xs italic">Sem data nasc.</span>
                          )}
                          <span className="text-xs pl-5">{m.idade ? `${m.idade} anos` : '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {m.telefone ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {formatPhone(m.telefone)}
                          </span>
                        ) : <span className="text-muted-foreground/50 text-xs">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                           <Briefcase className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
                           <span>{m.ocupacao || <span className="text-muted-foreground/50 italic">Não inf.</span>}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {Number(m.renda) > 0 ? (
                           <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {Number(m.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        ) : <span className="text-muted-foreground opacity-50">-</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMember(m.id)}>
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

            {/* Versão Mobile: Cards */}
            <div className="md:hidden divide-y">
               {members.map((m) => (
                 <div key={m.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {m.nome.charAt(0).toUpperCase()}
                           </div>
                           <div>
                              <p className="font-semibold text-sm">{m.nome}</p>
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mt-0.5">{m.parentesco}</Badge>
                           </div>
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70" onClick={() => removeMember(m.id)}>
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm bg-muted/20 p-3 rounded-lg">
                       {m.cpf && (
                          <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground uppercase font-bold">CPF</span>
                             <span className="font-mono text-xs">{formatCPF(m.cpf)}</span>
                          </div>
                       )}
                       <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Idade/Nasc</span>
                          <span>{m.idade ? `${m.idade} anos` : (m.nascimento ? formatDateSafe(m.nascimento) : '-')}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Renda</span>
                          <span className="font-medium text-emerald-600">{Number(m.renda) > 0 ? Number(m.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Contato</span>
                          <span>{m.telefone ? formatPhone(m.telefone) : '-'}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Adicionar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Familiar</DialogTitle>
            <DialogDescription>Preencha os dados do membro para compor o núcleo familiar.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Seção 1: Identificação */}
            <div className="space-y-4">
               <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-1">
                  <User className="h-3.5 w-3.5" /> Identificação
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo <span className="text-red-500">*</span></Label>
                    <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do familiar" />
                  </div>
                  <div className="space-y-2">
                    <Label>Parentesco <span className="text-red-500">*</span></Label>
                    <Select value={parentesco} onValueChange={setParentesco}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                    <MaskedInput mask="000.000.000-00" value={cpf} onAccept={(v: string) => setCpf(v)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Nascimento</Label>
                    <Input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} />
                  </div>
               </div>
            </div>

            {/* Seção 2: Sócio-econômico */}
            <div className="space-y-4 mt-2">
               <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 border-b pb-1">
                  <Briefcase className="h-3.5 w-3.5" /> Dados Sócio-econômicos
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ocupação</Label>
                    <Input value={ocupacao} onChange={e => setOcupacao(e.target.value)} placeholder="Ex: Estudante, Autônomo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Renda Mensal (R$)</Label>
                    <div className="relative">
                      <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" type="number" value={renda} onChange={e => setRenda(e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <MaskedInput mask="(00) 00000-0000" value={telefone} onAccept={(v: string) => setTelefone(v)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
  {/* [CORREÇÃO] O 'title' foi movido para o Label para corrigir o erro de TS e melhorar a área de hover */}
  <Label className="flex items-center gap-1 cursor-help" title="Preencher apenas se não souber a data de nascimento">
    Idade 
    <AlertCircle className="h-3 w-3 text-muted-foreground" />
  </Label>
  <Input 
    type="number" 
    value={idade} 
    onChange={e => setIdade(e.target.value)} 
    placeholder="Aprox." 
    disabled={!!nascimento} 
  />
</div>
               </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMember()} disabled={!nome || !parentesco || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Familiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}