// frontend/src/pages/UserManagement.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Loader2, Trash2, Edit, Lock } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { NewUserDialog } from '@/components/settings/NewUserDialog'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { cn } from '@/lib/utils'

// [CORREÇÃO 1] Adicionado estilo para o cargo de Auditor na listagem
const RoleBadge = ({ role }: { role: string }) => {
  const styles = {
    'Gerente': 'bg-purple-100 text-purple-700 border-purple-200',
    'Especialista': 'bg-blue-100 text-blue-700 border-blue-200',
    'Agente_Social': 'bg-slate-100 text-slate-700 border-slate-200',
    'Auditor': 'bg-amber-100 text-amber-700 border-amber-200' // Novo Estilo
  }
  
  // Tratamento para exibir "Agente Social" sem underscore, se necessário
  const roleName = role.replace('_', ' ')
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[role as keyof typeof styles] || styles['Agente_Social']}`}>
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar Servidor</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo</Label>
          <Controller name="nome" control={control} render={({ field }) => <Input id="nome" {...field} />} />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Institucional</Label>
          <Controller name="email" control={control} render={({ field }) => <Input id="email" type="email" {...field} />} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo / Função</Label>
          <Controller
            name="cargo"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agente_Social">Agente Social</SelectItem>
                  <SelectItem value="Especialista">Especialista</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  {/* [CORREÇÃO 2] Adicionada a opção Auditor no Modal de Edição */}
                  <SelectItem value="Auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.cargo && <p className="text-sm text-destructive">{errors.cargo.message}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
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
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="p-4 bg-destructive/10 rounded-full border border-destructive/20">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            O módulo de gestão de equipe é exclusivo para o perfil de Gerência.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Controle de acessos e cadastro de servidores da unidade.
          </p>
        </div>
        <NewUserDialog />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Servidores Ativos</CardTitle>
          <CardDescription>Lista completa de profissionais cadastrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Email Institucional</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && ( <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow> )}
                {isError && ( <TableRow><TableCell colSpan={5} className="py-10 text-center text-destructive">Não foi possível carregar a lista de servidores.</TableCell></TableRow> )}
                
                {users?.map((userData) => (
                  <TableRow key={userData.id} className="hover:bg-muted/5">
                    <TableCell className={cn("font-medium transition-all duration-300", isPrivacyMode && "blur-[5px] select-none")}>
                      {userData.nome}
                    </TableCell>
                    
                    <TableCell className={cn("text-muted-foreground transition-all duration-300", isPrivacyMode && "blur-[5px] select-none")}>
                      {userData.email}
                    </TableCell>
                    
                    <TableCell className="font-mono text-xs">{userData.matricula || '-'}</TableCell>
                    <TableCell>
                      <RoleBadge role={userData.cargo} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={editingUser?.id === userData.id} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingUser(userData)} className="h-8 w-8">
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          {editingUser?.id === userData.id && <EditUserModal user={editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)} />}
                        </Dialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Desativar Acesso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O servidor <strong className={cn(isPrivacyMode && "blur-[4px] select-none")}>{userData.nome}</strong> perderá o acesso ao sistema imediatamente. <br/>
                                <span className="font-medium text-foreground block mt-2">O histórico de ações e auditoria será preservado.</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(userData.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desativar Acesso"}
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}