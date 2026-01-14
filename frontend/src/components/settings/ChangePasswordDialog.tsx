// frontend/src/components/settings/ChangePasswordDialog.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, LockKeyhole, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'

// --- SCHEMA DE VALIDAÇÃO ---
const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, 'A senha atual é obrigatória.'),
  novaSenha: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
  confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: "As senhas não coincidem.",
  path: ["confirmarSenha"],
})

type ChangePasswordData = z.infer<typeof changePasswordSchema>

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      await api.patch('/users/me/password', {
        senhaAtual: data.senhaAtual,
        novaSenha: data.novaSenha
      })
    },
    onSuccess: () => {
      toast.success("Senha atualizada com segurança!")
      handleClose()
    },
    onError: (err: any) => {
      // Tenta pegar a mensagem específica do backend, senão usa genérica
      const message = err.response?.data?.message || "Não foi possível alterar a senha."
      toast.error(message)
    }
  })

  const handleClose = () => {
    setOpen(false)
    reset() // Limpa o formulário ao fechar
  }

  const onSubmit = (data: ChangePasswordData) => {
    mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 h-8">
          <LockKeyhole className="mr-2 h-4 w-4 text-muted-foreground" /> 
          Alterar Senha
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Para sua segurança, confirme sua senha atual antes de definir uma nova.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          
          {/* Senha Atual */}
          <div className="space-y-2">
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <Input 
              id="senhaAtual" 
              type="password" 
              placeholder="••••••"
              {...register('senhaAtual')} 
            />
            {errors.senhaAtual && (
              <p className="text-xs text-destructive font-medium">{errors.senhaAtual.message}</p>
            )}
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <Input 
              id="novaSenha" 
              type="password" 
              placeholder="No mínimo 6 caracteres"
              {...register('novaSenha')} 
            />
            {errors.novaSenha && (
              <p className="text-xs text-destructive font-medium">{errors.novaSenha.message}</p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
            <Input 
              id="confirmarSenha" 
              type="password" 
              placeholder="Repita a nova senha"
              {...register('confirmarSenha')} 
            />
            {errors.confirmarSenha && (
              <p className="text-xs text-destructive font-medium">{errors.confirmarSenha.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}