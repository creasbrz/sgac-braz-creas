// frontend/src/pages/Login.tsx
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginFormSchema = z.object({
  email: z.string().email('Por favor, insira um email válido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

type LoginFormData = z.infer<typeof loginFormSchema>

export function Login() {
  const { login, isLoginLoading } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
  })

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    try {
      await login(data)
    } catch (error) {
      console.error('Falha no componente de Login:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>SGAC-BRAZ</CardTitle>
          <CardDescription>
            Sistema de Gestão de Atendimentos do CREAS
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="gerente@creas.com"
                {...register('email')}
                disabled={isLoginLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                {...register('senha')}
                disabled={isLoginLoading}
              />
              {errors.senha && (
                <p className="text-sm text-destructive">
                  {errors.senha.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoginLoading}>
              {isLoginLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

