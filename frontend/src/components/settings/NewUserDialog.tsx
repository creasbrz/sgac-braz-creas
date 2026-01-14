// frontend/src/components/team/NewUserDialog.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Loader2, UserPlus, User, Mail, BadgeCheck, Lock, Briefcase 
} from 'lucide-react'

import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// --- SCHEMA ---
const newUserFormSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cargo: z.enum(["Gerente", "Agente_Social", "Especialista", "Auditor"]),
  matricula: z.string().optional(),
  senhaInicial: z.string().min(6, "Mínimo de 6 caracteres"),
})

type NewUserFormData = z.infer<typeof newUserFormSchema>

export function NewUserDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<NewUserFormData>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: {
      nome: "",
      email: "",
      matricula: "",
      cargo: "Agente_Social",
      senhaInicial: "", // Senha padrão mais forte
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewUserFormData) => {
      await api.post('/users', data)
    },
    onSuccess: () => {
      toast.success("Servidor cadastrado com sucesso!")
      setOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['team-stats'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erro ao cadastrar servidor.")
    }
  })

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
          <UserPlus className="h-4 w-4" /> Novo Servidor
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Novo Servidor
          </DialogTitle>
          <DialogDescription>
            Crie o acesso para um novo membro da equipe técnica.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-5 py-4">
            
            {/* DADOS PESSOAIS */}
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> Nome Completo
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-mail
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="joao.silva@sedes.df.gov.br" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" /> Matrícula
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="0000000-0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* DADOS DE ACESSO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Cargo / Função
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Agente_Social">Agente Social</SelectItem>
                        <SelectItem value="Especialista">Especialista</SelectItem>
                        <SelectItem value="Gerente">Gerente</SelectItem>
                        <SelectItem value="Auditor">Auditor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="senhaInicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Senha Inicial
                    </FormLabel>
                    <FormControl>
                      <Input type="text" {...field} className="font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Acesso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}