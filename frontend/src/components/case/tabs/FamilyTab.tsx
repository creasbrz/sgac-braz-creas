// frontend/src/components/case/tabs/FamilyTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Users, PlusCircle, Trash2, Wallet, Briefcase, User, Phone, FileText
} from 'lucide-react' // [CORREÇÃO] Removido Calendar
import { Loader2 } from 'lucide-react'
import { IMaskInput } from 'react-imask'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateSafe, formatCPF, formatPhone } from '@/utils/formatters'

import type { FamilyMember } from '@/types/case'

interface FamilyTabProps {
  caseId: string
}

// Máscaras locais
const CPF_MASK = { mask: '000.000.000-00' }
const PHONE_MASK = { mask: '(00) 00000-0000' }

export function FamilyTab({ caseId }: FamilyTabProps) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Form States
  const [nome, setNome] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [idade, setIdade] = useState('')
  const [ocupacao, setOcupacao] = useState('')
  const [renda, setRenda] = useState('')
  
  // [NOVOS ESTADOS]
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [telefone, setTelefone] = useState('')

  // 1. Buscar Família
  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['family', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/family`)).data
  })

  // 2. Adicionar Membro
  const { mutate: addMember, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      await api.post(`/cases/${caseId}/family`, {
        nome,
        parentesco,
        idade: idade ? parseInt(idade) : undefined,
        ocupacao,
        renda: renda ? parseFloat(renda.replace(',', '.')) : undefined,
        // Enviando novos campos
        cpf: cpf || null,
        nascimento: nascimento || null,
        telefone: telefone || null
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

  // 3. Remover Membro
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
    <div className="space-y-6 animate-in fade-in">
      
      {/* Header e Métricas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Composição Familiar
          </h3>
          <p className="text-xs text-muted-foreground">
            Pessoas que coabitam ou possuem vínculo direto.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Renda Total</span>
            <span className="font-bold text-emerald-600">
              {totalRenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Per Capita</span>
            <span className="font-medium">
              {perCapita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
        
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome / CPF</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead className="whitespace-nowrap">Nascimento / Idade</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead className="text-right">Renda</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
              )}
              {!isLoading && members.length === 0 && (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum familiar cadastrado.</TableCell></TableRow>
              )}
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" /> {m.nome}
                      </span>
                      {m.cpf && <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><FileText className="h-3 w-3"/> {formatCPF(m.cpf)}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.parentesco}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      {m.nascimento ? (
                        <>
                          <span>{formatDateSafe(m.nascimento)}</span>
                          <span className="text-xs text-muted-foreground">{m.idade ? `${m.idade} anos` : ''}</span>
                        </>
                      ) : (
                        <span>{m.idade ? `${m.idade} anos` : '-'}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {m.telefone ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {formatPhone(m.telefone)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {m.ocupacao ? (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Briefcase className="h-3 w-3" /> {m.ocupacao}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {m.renda ? Number(m.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Adicionar */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Familiar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            {/* Linha 1: Nome e Parentesco */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Nome Completo</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do familiar" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Parentesco</Label>
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

            {/* Linha 2: CPF e Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <div className="relative">
                   <IMaskInput
                      {...CPF_MASK}
                      value={cpf}
                      onAccept={(v: string) => setCpf(v)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="000.000.000-00"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} />
              </div>
            </div>

            {/* Linha 3: Telefone e Idade (Manual) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                 <IMaskInput
                      {...PHONE_MASK}
                      value={telefone}
                      onAccept={(v: string) => setTelefone(v)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(00) 00000-0000"
                    />
              </div>
              <div className="space-y-2">
                <Label>Idade Aprox. (Opcional)</Label>
                <Input type="number" value={idade} onChange={e => setIdade(e.target.value)} placeholder="Se não tiver data" />
              </div>
            </div>

            {/* Linha 4: Ocupação e Renda */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ocupação</Label>
                <Input value={ocupacao} onChange={e => setOcupacao(e.target.value)} placeholder="Ex: Estudante" />
              </div>
              <div className="space-y-2">
                <Label>Renda (R$)</Label>
                <div className="relative">
                  <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" type="number" value={renda} onChange={e => setRenda(e.target.value)} placeholder="0,00" />
                </div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMember()} disabled={!nome || !parentesco || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}