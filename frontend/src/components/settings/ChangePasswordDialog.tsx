// frontend/src/components/settings/ChangePasswordDialog.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LockKeyhole } from "lucide-react"
import { toast } from "sonner"

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await api.patch('/users/me/password', { senhaAtual, novaSenha })
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!")
      setOpen(false)
      setSenhaAtual('')
      setNovaSenha('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erro ao alterar senha.")
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 h-8">
          <LockKeyhole className="mr-2 h-4 w-4" /> Alterar Senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <Input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutate()} disabled={isPending || !senhaAtual || !novaSenha}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}