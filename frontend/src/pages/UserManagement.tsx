// frontend/src/pages/UserManagement.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Loader2, Trash2, Edit } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getErrorMessage } from '@/utils/error'

interface User {
  id: string
  nome: string
  email: string
  cargo: string
}

export function UserManagement() {
  const queryClient = useQueryClient()

  const { data: users, isLoading, isError } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: async (userId: string) => {
      return await api.delete(`/users/${userId}`)
    },
    onSuccess: () => {
      toast.success('Utilizador desativado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao desativar o utilizador.'))
    },
  })

  // A lógica de edição pode ser adicionada aqui, com um modal e um formulário.
  const handleEdit = (user: User) => {
    toast.info(`Funcionalidade de edição para ${user.nome} a ser implementada.`)
  }

  const handleDelete = (userId: string) => {
    // Adicionar um diálogo de confirmação aqui seria uma boa prática
    deleteUser(userId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
        <p className="text-muted-foreground">
          Adicione, edite ou desative os profissionais do sistema.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-destructive">
                  Falha ao carregar os utilizadores.
                </TableCell>
              </TableRow>
            )}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.nome}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.cargo}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(user.id)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

