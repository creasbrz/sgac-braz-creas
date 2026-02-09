// frontend/src/components/case/tabs/FamilyTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Users, PlusCircle, Trash2, Loader2, MoreHorizontal, 
  Link as LinkIcon, Unlink, ExternalLink, UserCheck, ShieldAlert, FileText
} from 'lucide-react'
import { IMaskInput } from 'react-imask'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'

import { OPTIONS } from '@/constants/options'
import { LinkCaseModal } from '@/components/modals/LinkCaseModal'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

interface FamilyTabProps {
  caseId: string
  caseName: string
  titularRenda?: number
  casoPrincipal?: { id: string, nomeCompleto: string } | null
  casosVinculados?: { id: string, nomeCompleto: string, status: string }[]
}

export function FamilyTab({ caseId, caseName, titularRenda = 0, casoPrincipal, casosVinculados = [] }: FamilyTabProps) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)

  // States do Form
  const [nome, setNome] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [idade, setIdade] = useState('')
  const [cpf, setCpf] = useState('')
  const [renda, setRenda] = useState('')
  const [ocupacao, setOcupacao] = useState('')
  const [violacoes, setViolacoes] = useState<string[]>([])

  // Busca Membros
  const { data: membros = [], isLoading } = useQuery({
    queryKey: ['family', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/family`)).data
  })

  // Adicionar Membro
  const { mutate: addMember, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      await api.post(`/cases/${caseId}/family`, {
        nome, parentesco, idade: Number(idade), cpf, 
        renda: parseFloat(renda.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0,
        ocupacao, violacao: violacoes
      })
    },
    onSuccess: () => {
      toast.success("Familiar adicionado!")
      setIsAddOpen(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
    onError: () => toast.error("Erro ao adicionar familiar.")
  })

  // Remover Membro
  const { mutate: removeMember } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/family/${id}`),
    onSuccess: () => {
      toast.success("Membro removido.")
      queryClient.invalidateQueries({ queryKey: ['family', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
    onError: () => toast.error("Erro ao remover.")
  })

  // Desvincular Prontuário
  const { mutate: unlinkCase } = useMutation({
    mutationFn: async (targetId: string) => {
        const idToUpdate = targetId === caseId ? caseId : targetId
        await api.patch(`/cases/${idToUpdate}`, { casoPrincipalId: null })
    },
    onSuccess: () => {
        toast.success("Vínculo desfeito.")
        queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    },
    onError: () => toast.error("Erro ao remover vínculo.")
  })

  const resetForm = () => {
    setNome(''); setParentesco(''); setIdade(''); setCpf(''); setRenda(''); setOcupacao(''); setViolacoes([])
  }

  const handleViolationChange = (violation: string, checked: boolean) => {
    setViolacoes(prev => checked ? [...prev, violation] : prev.filter(v => v !== violation))
  }

  const rendaMembros = membros.reduce((acc: number, m: any) => acc + Number(m.renda), 0)
  const rendaTotal = Number(titularRenda) + rendaMembros
  const totalPessoas = membros.length + 1
  const perCapita = totalPessoas > 0 ? rendaTotal / totalPessoas : 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-8">
      
      {/* 1. SEÇÃO: ESTRUTURA SISTÊMICA (PRONTUÁRIOS VINCULADOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Cartão PAI */}
         <Card className={cn("border-l-4 shadow-sm", casoPrincipal ? "border-l-blue-500 bg-blue-50/30" : "border-l-muted bg-muted/10")}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                    <span className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary"/> Prontuário de Referência</span>
                    {casoPrincipal ? 
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ativo</Badge> : 
                      <Badge variant="secondary" className="text-muted-foreground opacity-70">Ausente</Badge>
                    }
                </CardTitle>
                <CardDescription className="text-xs">Responsável familiar ou titular principal deste núcleo.</CardDescription>
            </CardHeader>
            <CardContent>
                {casoPrincipal ? (
                    <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 border-blue-200">
                                {casoPrincipal.nomeCompleto.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{casoPrincipal.nomeCompleto}</p>
                                {/* [CORREÇÃO] Rota atualizada para /app/cases/... */}
                                <Link to={`/app/cases/${casoPrincipal.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                    Acessar Prontuário <ExternalLink className="h-3 w-3"/>
                                </Link>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => unlinkCase(caseId)} title="Desvincular">
                            <Unlink className="h-4 w-4"/>
                        </Button>
                    </div>
                ) : (
                    <div className="text-center py-6 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/10">
                        <p className="text-xs text-muted-foreground mb-3 font-medium">Não há vínculo com responsável.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsLinkOpen(true)} className="gap-2 h-8 text-xs">
                            <LinkIcon className="h-3.5 w-3.5"/> Vincular Responsável
                        </Button>
                    </div>
                )}
            </CardContent>
         </Card>

         {/* Cartão FILHOS */}
         <Card className="border shadow-sm bg-card hover:bg-accent/5 transition-colors">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500"/> Dependentes Vinculados</span>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100">{casosVinculados.length} Prontuários</Badge>
                </CardTitle>
                <CardDescription className="text-xs">Outros prontuários que dependem deste caso.</CardDescription>
            </CardHeader>
            <CardContent>
                {casosVinculados && casosVinculados.length > 0 ? (
                    <ScrollArea className="h-36 pr-3">
                      <div className="space-y-2">
                          {casosVinculados.map(vinculo => (
                              <div key={vinculo.id} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-7 w-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-purple-200">
                                          {vinculo.nomeCompleto.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                          <p className="font-medium text-sm truncate max-w-37.5 sm:max-w-50">{vinculo.nomeCompleto}</p>
                                          {/* [CORREÇÃO] Rota atualizada para /app/cases/... */}
                                          <Link to={`/app/cases/${vinculo.id}`} className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-1">
                                              Ver Prontuário <ExternalLink className="h-2.5 w-2.5"/>
                                          </Link>
                                      </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => unlinkCase(vinculo.id)}>
                                      <Unlink className="h-3.5 w-3.5"/>
                                  </Button>
                              </div>
                          ))}
                      </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center py-6 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/10 h-36">
                        <p className="text-xs text-muted-foreground mb-3 font-medium">Nenhum prontuário dependente.</p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-2" onClick={() => setIsLinkOpen(true)}>
                           <PlusCircle className="h-3.5 w-3.5"/> Adicionar Vínculo
                        </Button>
                    </div>
                )}
            </CardContent>
         </Card>
      </div>

      {/* 2. SEÇÃO: COMPOSIÇÃO FAMILIAR (COABITANTES) */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b pb-4">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20"><Users className="h-4 w-4 text-primary"/></div>
                  Composição Familiar (Coabitantes)
                </CardTitle>
                <CardDescription>Membros que residem no mesmo domicílio.</CardDescription>
              </div>
              <div className="flex items-center gap-3 bg-background p-1.5 pl-4 rounded-lg border shadow-sm">
                 <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Renda Total</p>
                    <p className="font-mono font-bold text-sm text-foreground">{rendaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
                 <div className="w-px h-8 bg-border"></div>
                 <div className="text-right mr-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Per Capita</p>
                    <p className={cn("font-mono font-bold text-sm", perCapita < 218 ? "text-red-600" : "text-green-600")}>{perCapita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
                 <Button onClick={() => setIsAddOpen(true)} size="sm" className="shadow-sm"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button>
              </div>
           </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[25%]">Nome</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Renda</TableHead>
                <TableHead>Violações</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-primary/5 hover:bg-primary/10 transition-colors">
                <TableCell className="font-medium flex items-center gap-2 py-3">
                    <UserCheck className="h-4 w-4 text-primary shrink-0"/> 
                    <span className="truncate">{caseName}</span>
                    <Badge variant="secondary" className="text-[9px] bg-background border-primary/20 ml-auto hidden sm:inline-flex">Titular</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">Consulte na Visão Geral</TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="font-mono text-sm font-medium">{Number(titularRenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell className="text-muted-foreground text-xs italic">Ver na aba Geral</TableCell>
                <TableCell></TableCell>
              </TableRow>

              {isLoading ? (
                 <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary"/></TableCell></TableRow>
              ) : membros.length === 0 ? (
                 <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Nenhum outro membro cadastrado neste domicílio.</TableCell></TableRow>
              ) : (
                 membros.map((m: any) => (
                    <TableRow key={m.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell>{m.parentesco}</TableCell>
                        <TableCell>{m.idade} anos</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3 opacity-50"/> {m.cpf || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs truncate max-w-25">{m.ocupacao}</TableCell>
                        <TableCell className="font-mono text-sm">{Number(m.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell>
                            {m.violacao && m.violacao.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {m.violacao.slice(0, 2).map((v: string) => (
                                        <Badge key={v} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{v}</Badge>
                                    ))}
                                    {m.violacao.length > 2 && <Badge variant="outline" className="text-[10px] text-muted-foreground">+{m.violacao.length - 2}</Badge>}
                                </div>
                            ) : <span className="text-muted-foreground text-xs opacity-50">Nenhuma</span>}
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => removeMember(m.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Remover Familiar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                 ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Adicionar Familiar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b">
            <DialogTitle className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20"><Users className="h-4 w-4 text-primary"/></div>
                Adicionar Familiar
            </DialogTitle>
            <DialogDescription>Preencha os dados do membro para compor a renda per capita.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <Label>Parentesco</Label>
                <Select value={parentesco} onValueChange={setParentesco}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {['Cônjuge', 'Filho(a)', 'Enteado(a)', 'Neto(a)', 'Pai/Mãe', 'Irmão(ã)', 'Avô(ó)', 'Tio(a)', 'Sobrinho(a)', 'Outro'].map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input type="number" value={idade} onChange={e => setIdade(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>CPF (Opcional)</Label>
                <IMaskInput mask="000.000.000-00" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={cpf} onAccept={(val: any) => setCpf(val)} placeholder="000.000.000-00"/>
              </div>
              <div className="space-y-2">
                <Label>Renda</Label>
                <IMaskInput mask="R$ num" blocks={{ num: { mask: Number, thousandsSeparator: '.', radix: ',' } }} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" value={renda} onAccept={(val: any) => setRenda(val)} placeholder="R$ 0,00"/>
              </div>
            </div>

            <div className="space-y-2">
                <Label>Ocupação / Situação</Label>
                <Select value={ocupacao} onValueChange={setOcupacao}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {OPTIONS.ocupacao.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-3 border rounded-md p-3 bg-muted/10">
               <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><ShieldAlert className="h-4 w-4 text-status-warning-fg"/> Violações de Direitos (Se houver)</Label>
               <ScrollArea className="h-32 pr-2">
                 <div className="grid grid-cols-2 gap-2">
                   {OPTIONS.violacao.map(v => (
                     <div key={v} className="flex items-center space-x-2 p-1 hover:bg-background/50 rounded transition-colors">
                       <Checkbox id={`v-${v}`} checked={violacoes.includes(v)} onCheckedChange={(c) => handleViolationChange(v, c as boolean)} className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"/>
                       <label htmlFor={`v-${v}`} className="text-xs font-medium leading-none cursor-pointer text-foreground/80">{v}</label>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/10 border-t">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMember()} disabled={!nome || !parentesco || isAdding} className="shadow-sm font-semibold min-w-32">{isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <LinkCaseModal isOpen={isLinkOpen} onOpenChange={setIsLinkOpen} currentCaseId={caseId} currentCaseName={caseName}/>
    </div>
  )
}