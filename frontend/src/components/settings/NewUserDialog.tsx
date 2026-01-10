import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

// --- SCHEMA DEFINITION ---
// Definimos aqui para garantir sincronia total com o formulário e evitar erros de build
const newUserFormSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cargo: z.enum(["Gerente", "Agente_Social", "Especialista", "Auditor"]),
  // Matricula é opcional no banco, mas o input retorna string vazia, então tratamos assim:
  matricula: z.string().optional(),
  // IMPORTANTE: Senha obrigatória para criação, garantindo que não seja undefined
  senhaInicial: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"), 
})

type NewUserFormData = z.infer<typeof newUserFormSchema>

export function NewUserDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const { control, handleSubmit, formState: { errors }, reset } = useForm<NewUserFormData>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: {
      nome: "",
      email: "",
      matricula: "",
      cargo: "Agente_Social", // Valor default seguro para o Enum
      senhaInicial: "123456"  // Valor default para evitar erro de tipo (undefined)
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewUserFormData) => {
      await api.post('/users', data)
    },
    onSuccess: () => {
      toast.success("Servidor cadastrado com sucesso!")
      setOpen(false)
      reset() 
      // Invalida queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['team-stats'] })
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(err.response?.data?.message || "Erro ao cadastrar servidor.")
    }
  })

  const onSubmit = (data: NewUserFormData) => {
    mutate(data)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) reset() // Limpa erros e campos ao fechar
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
          <UserPlus className="h-4 w-4" /> Novo Servidor
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Servidor</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar um membro à equipe técnica.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-right">Nome Completo</Label>
            <Controller
              name="nome"
              control={control}
              render={({ field }) => (
                <Input id="nome" placeholder="Ex: João da Silva" {...field} />
              )}
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Institucional</Label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input id="email" type="email" placeholder="nome@sedes.df.gov.br" {...field} />
                )}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Matrícula */}
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Controller
                name="matricula"
                control={control}
                render={({ field }) => (
                  <Input id="matricula" placeholder="0000000-0" {...field} value={field.value || ''} />
                )}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Cargo */}
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Controller
                name="cargo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="cargo">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Agente_Social">Agente Social</SelectItem>
                      <SelectItem value="Especialista">Especialista (Técnico)</SelectItem>
                      <SelectItem value="Gerente">Gerente</SelectItem>
                      <SelectItem value="Auditor">Auditor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cargo && <p className="text-xs text-destructive">{errors.cargo.message}</p>}
            </div>
            
            {/* Senha Inicial */}
            <div className="space-y-2">
              <Label htmlFor="senhaInicial">Senha Inicial</Label>
              <Controller
                name="senhaInicial"
                control={control}
                render={({ field }) => (
                  <Input id="senhaInicial" {...field} />
                )}
              />
              {errors.senhaInicial && <p className="text-xs text-destructive">{errors.senhaInicial.message}</p>}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}