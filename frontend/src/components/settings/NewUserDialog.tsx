// frontend/src/components/settings/NewUserDialog.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

export function NewUserDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    nome: '', email: '', matricula: '', cargo: 'Agente_Social', senhaInicial: '123456'
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await api.post('/users', formData)
    },
    onSuccess: () => {
      toast.success("Servidor cadastrado com sucesso!")
      setOpen(false)
      setFormData({ nome: '', email: '', matricula: '', cargo: 'Agente_Social', senhaInicial: '123456' })
      queryClient.invalidateQueries({ queryKey: ['team-stats'] }) // Atualiza gráficos se necessário
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erro ao cadastrar.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <UserPlus className="h-4 w-4" /> Novo Servidor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Membro</DialogTitle>
          <DialogDescription>Adicione um novo servidor à equipe do CREAS.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail Institucional</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={formData.cargo} onValueChange={v => setFormData({...formData, cargo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agente_Social">Agente Social</SelectItem>
                  <SelectItem value="Especialista">Especialista (Técnico)</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Senha Inicial</Label>
              <Input value={formData.senhaInicial} onChange={e => setFormData({...formData, senhaInicial: e.target.value})} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutate()} disabled={isPending || !formData.nome || !formData.email}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}