// frontend/src/pages/UserManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Loader2, Trash2, Edit, Lock, ShieldCheck } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { getErrorMessage } from '@/utils/error'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { editUserFormSchema } from '@/schemas/userSchemas'
import type { User } from '@/types/user'
import { useAuth } from '@/contexts/AuthContext'
import { NewUserDialog } from '@/components/settings/NewUserDialog'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

// Badge de Cargo com Cores Semânticas
const RoleBadge = ({ role }: { role: string }) => {
  const styles: Record<string, string> = {
    'Gerente': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    'Especialista': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    'Agente_Social': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    'Auditor': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
  }
  
  const roleName = role.replace('_', ' ')
  const activeStyle = styles[role] || styles['Agente_Social']
  
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide", activeStyle)}>
      {roleName}
    </span>
  )
}

type EditUserFormData = z.infer<typeof editUserFormSchema>

function EditUserModal({ user, onOpenChange }: { user: User; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      nome: user.nome,
      email: user.email,
      // @ts-ignore - Permite passar Auditor mesmo se o schema antigo não prever
      cargo: user.cargo,
    },
  })

  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      return api.put(`/users/${user.id}`, data)
    },
    onSuccess: () => {
      toast.success('Servidor atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const onSubmit: SubmitHandler<EditUserFormData> = (data) => {
    updateUser(data)
  }

  return (
    <DialogContent className="sm:max-w-106.25">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
           <Edit className="h-5 w-5 text-primary" /> Editar Servidor
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo</Label>
          <Controller name="nome" control={control} render={({ field }) => <Input id="nome" {...field} className="bg-background" />} />
          {errors.nome && <p className="text-xs font-medium text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Institucional</Label>
          <Controller name="email" control={control} render={({ field }) => <Input id="email" type="email" {...field} className="bg-background" />} />
          {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo / Função</Label>
          <Controller
            name="cargo"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agente_Social">Agente Social</SelectItem>
                  <SelectItem value="Especialista">Especialista</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.cargo && <p className="text-xs font-medium text-destructive">{errors.cargo.message}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" disabled={isPending} className="min-w-28">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function UserManagement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { isPrivacyMode } = usePrivacy()

  const [editingUser, setEditingUser] = useState<User | null>(null)

  const { data: users, isLoading, isError } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
    enabled: !!user
  })

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/users/${userId}`)
    },
    onSuccess: () => {
      toast.success('Acesso desativado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao desativar servidor.'))
    },
  })

  if (user?.cargo !== 'Gerente') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95 p-4">
        <div className="p-5 bg-destructive/10 rounded-full border border-destructive/20 shadow-sm">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            O módulo de gestão de equipe e controle de acessos é exclusivo para o perfil de <strong>Gerência</strong>.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2 md:p-0">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
             <ShieldCheck className="h-7 w-7 text-primary/80" /> Gestão de Acessos
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Administração de usuários, permissões e cadastro de novos servidores da unidade.
          </p>
        </div>
        <NewUserDialog />
      </div>
      
      <Card className="border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-4 bg-muted/20 border-b border-border px-6 pt-5">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
               <CardTitle className="text-lg font-semibold">Servidores Ativos</CardTitle>
               <CardDescription>Lista completa de profissionais com acesso ao sistema.</CardDescription>
             </div>
             <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border/50">
                <span>Total:</span>
                <span className="font-bold text-foreground">{users?.length || 0}</span>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="w-[30%] pl-6 h-11 font-semibold text-muted-foreground">Nome</TableHead>
                <TableHead className="w-[30%] h-11 font-semibold text-muted-foreground">Email Institucional</TableHead>
                <TableHead className="h-11 font-semibold text-muted-foreground">Matrícula</TableHead>
                <TableHead className="h-11 font-semibold text-muted-foreground">Cargo</TableHead>
                <TableHead className="text-right pr-6 h-11 font-semibold text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && ( 
                  <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <span className="text-xs font-medium">Carregando lista...</span>
                          </div>
                      </TableCell>
                  </TableRow> 
              )}
              
              {isError && ( 
                  <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-destructive font-medium bg-destructive/5">
                          Não foi possível carregar a lista de servidores. Tente novamente.
                      </TableCell>
                  </TableRow> 
              )}
              
              {users?.map((userData) => (
                <TableRow key={userData.id} className="group hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
                  <TableCell className="pl-6 py-3.5">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                           {userData.nome.charAt(0)}
                        </div>
                        <span className={cn("font-medium text-sm text-foreground", isPrivacyMode && "blur-[6px] select-none opacity-80")}>
                          {userData.nome}
                        </span>
                     </div>
                  </TableCell>
                  
                  <TableCell className={cn("text-muted-foreground text-sm", isPrivacyMode && "blur-xs select-none opacity-60")}>
                    {userData.email}
                  </TableCell>
                  
                  <TableCell className="font-mono text-xs text-muted-foreground/80 tracking-wide">
                      {userData.matricula || '-'}
                  </TableCell>
                  
                  <TableCell>
                    <RoleBadge role={userData.cargo} />
                  </TableCell>
                  
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100">
                      <Dialog open={editingUser?.id === userData.id} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(userData)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        {editingUser?.id === userData.id && <EditUserModal user={editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)} />}
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive flex items-center gap-2">
                               <Trash2 className="h-5 w-5"/> Desativar Acesso?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              O servidor <strong className={cn("text-foreground", isPrivacyMode && "blur-sm")}>{userData.nome}</strong> perderá o acesso ao sistema imediatamente. <br/>
                              <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border/50 text-xs text-muted-foreground">
                                 <strong>Nota:</strong> O histórico de ações, auditoria e casos vinculados a este usuário será preservado para fins de conformidade.
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(userData.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Confirmar Desativação
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}