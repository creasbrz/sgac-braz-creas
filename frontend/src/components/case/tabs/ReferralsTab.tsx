import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  Network, Plus, Calendar, CheckCircle2, Clock, XCircle, Trash2, MapPin
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

// Interface local
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

// [ATUALIZAÇÃO] Categorias contextualizadas para o DF/Brazlândia
const TIPOS_REDE = [
  "Saúde (SES/DF)",
  "Educação (SEEDF)",
  "Assistência Social (SEDES)",
  "Justiça & Direitos (MP/TJDFT)",
  "Conselho Tutelar",
  "Segurança Pública (PCDF/PMDF)",
  "Trabalho & Renda (SETEMP)",
  "Habitação (CODHAB)",
  "Transporte (Mobilidade)",
  "Outros"
]

// [NOVO] Placeholders dinâmicos baseados na realidade de Brazlândia
const EXEMPLOS_INSTITUICAO: Record<string, string> = {
  "Saúde (SES/DF)": "Ex: HRBz (Hospital Regional), UBS 01 (Vila São José), CAPS AD, CAPS i...",
  "Educação (SEEDF)": "Ex: CRE Brazlândia, Escola Classe 01, CED 02, Creche Jequitibá...",
  "Assistência Social (SEDES)": "Ex: CRAS Brazlândia, Restaurante Comunitário, Unidade de Acolhimento...",
  "Justiça & Direitos (MP/TJDFT)": "Ex: MPDFT (Promotoria), Defensoria Pública, Fórum, NAFAVD...",
  "Conselho Tutelar": "Ex: Conselho Tutelar de Brazlândia (I ou II)",
  "Segurança Pública (PCDF/PMDF)": "Ex: 18ª DP, DEAM (Delegacia da Mulher), Provid...",
  "Trabalho & Renda (SETEMP)": "Ex: Agência do Trabalhador (Sine), Qualifica DF...",
  "Habitação (CODHAB)": "Ex: CODHAB (Inscrição/Regularização)",
  "Transporte (Mobilidade)": "Ex: Passe Livre Estudantil, Cartão PCD..."
}

export function ReferralsTab({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Estados do Form
  const [tipo, setTipo] = useState('')
  const [instituicao, setInstituicao] = useState('')
  const [motivo, setMotivo] = useState('')

  // Listar
  const { data: referrals = [], isLoading } = useQuery<Referral[]>({
    queryKey: ['referrals', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/referrals`)).data
  })

  // Criar
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

  // Atualizar Status
  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.patch(`/referrals/${id}`, { status })
    },
    onSuccess: () => {
      toast.success("Status atualizado.")
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    }
  })

  // Excluir
  const { mutate: removeReferral } = useMutation({
    mutationFn: async (id: string) => await api.delete(`/referrals/${id}`),
    onSuccess: () => {
      toast.success("Removido com sucesso.")
      queryClient.invalidateQueries({ queryKey: ['referrals', caseId] })
    },
    onError: () => toast.error("Apenas o autor pode remover.")
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONCLUIDO': return <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1"/> Concluído</Badge>
      case 'CANCELADO': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Cancelado</Badge>
      default: return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>
    }
  }

  // Define o placeholder com base na seleção
  const placeholderInstituicao = tipo ? (EXEMPLOS_INSTITUICAO[tipo] || "Nome da instituição ou órgão") : "Selecione o tipo de serviço primeiro..."

  return (
    <div className="space-y-6 animate-in fade-in">
      
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" /> Articulação em Rede (Brazlândia)
          </h3>
          <p className="text-sm text-muted-foreground">Gestão de encaminhamentos para a rede intersetorial.</p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Encaminhamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <Loader2 className="animate-spin h-8 w-8 mx-auto col-span-2" />}
        
        {!isLoading && referrals.length === 0 && (
          <div className="col-span-2 text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
            Nenhum encaminhamento registrado para este caso.
          </div>
        )}

        {referrals.map((ref) => (
          <Card key={ref.id} className="border shadow-sm flex flex-col justify-between group hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 overflow-hidden">
                  <Badge variant="outline" className="mb-2 truncate max-w-full">{ref.tipo}</Badge>
                  <CardTitle className="text-base font-bold leading-tight flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                    {ref.instituicao}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3"/> {format(new Date(ref.dataEnvio), "dd/MM/yyyy", { locale: ptBR })}
                    <span>•</span>
                    <span className="truncate">Resp: {ref.autor?.nome}</span>
                  </span>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(ref.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3 flex-1">
              <p className="text-sm text-foreground/80 mt-2 bg-muted/30 p-2 rounded-md italic border">
                "{ref.motivo}"
              </p>
              {ref.retorno && (
                <p className="text-xs text-emerald-700 mt-2 p-2 bg-emerald-50 rounded-md border border-emerald-100">
                  <strong>Retorno:</strong> {ref.retorno}
                </p>
              )}
            </CardContent>
            
            <div className="px-4 py-3 bg-muted/20 border-t flex justify-between items-center">
               <div className="flex gap-2">
                  {ref.status === 'PENDENTE' && (
                    <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" 
                      onClick={() => updateStatus({ id: ref.id, status: 'CONCLUIDO' })}>
                      <CheckCircle2 className="w-3 h-3 mr-1"/> Concluir
                    </Button>
                  )}
                  {ref.status !== 'CANCELADO' && (
                     <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-red-600"
                      onClick={() => updateStatus({ id: ref.id, status: 'CANCELADO' })}>
                      Cancelar
                    </Button>
                  )}
               </div>
               
               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeReferral(ref.id)}>
                  <Trash2 className="h-4 w-4"/>
               </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Encaminhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            
            <div className="space-y-2">
              <Label>Eixo / Rede</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o eixo..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TIPOS_REDE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Instituição de Destino</Label>
              <Input 
                placeholder={placeholderInstituicao} 
                value={instituicao} 
                onChange={e => setInstituicao(e.target.value)} 
                disabled={!tipo}
              />
              <p className="text-[10px] text-muted-foreground">
                Especifique o equipamento exato (Ex: UBS Vila São José)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo / Solicitação</Label>
              <Textarea 
                placeholder="Descreva o que está sendo solicitado (Ex: Vaga em creche, Avaliação psiquiátrica, Inclusão no Cadastro Único...)" 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)} 
                rows={4}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addReferral()} disabled={isPending || !instituicao || !motivo}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}