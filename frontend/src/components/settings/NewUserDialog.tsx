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
      senhaInicial: "", 
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
        <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95">
          <UserPlus className="h-4 w-4" /> Novo Servidor
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20 text-primary">
               <UserPlus className="h-5 w-5" />
            </div>
            Cadastrar Novo Servidor
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Crie o acesso para um novo membro da equipe técnica.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))} className="p-6 space-y-6">
            
            {/* DADOS PESSOAIS */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> Nome Completo
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João da Silva" className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive font-medium" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> E-mail Institucional
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="joao.silva@sedes.df.gov.br" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-destructive font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-muted-foreground">
                        <BadgeCheck className="h-3.5 w-3.5" /> Matrícula
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="0000000-0" className="bg-background font-mono" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs text-destructive font-medium" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* DADOS DE ACESSO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" /> Cargo / Função
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
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
                    <FormMessage className="text-xs text-destructive font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="senhaInicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" /> Senha Inicial
                    </FormLabel>
                    <FormControl>
                      <Input type="text" {...field} className="bg-background font-mono text-sm" placeholder="******" />
                    </FormControl>
                    <FormMessage className="text-xs text-destructive font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2 sm:justify-between gap-2 border-t border-border/60 mt-6">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-32 shadow-sm">
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