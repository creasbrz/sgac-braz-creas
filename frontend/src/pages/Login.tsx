// frontend/src/pages/Login.tsx
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GdfLogo } from '@/components/layout/GdfLogo' // Certifica-te que este componente existe

const loginFormSchema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
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
      console.error(error)
    }
  }

  return (
    <div className="w-full min-h-screen flex items-stretch overflow-hidden">
      
      {/* LADO ESQUERDO: Institucional / Visual */}
      <div className="hidden lg:flex w-1/2 relative bg-primary flex-col justify-between p-12 text-primary-foreground overflow-hidden">
        {/* Padrão de fundo sutil (opcional) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        
        {/* Logo Superior */}
        <div className="relative z-10 flex items-center gap-3 text-lg font-medium">
          <GdfLogo className="h-8 w-8" />
          <span>SEDES/DF</span>
        </div>

        {/* Mensagem Central */}
        <div className="relative z-10 space-y-4 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight">
            Gestão Integrada do CREAS Brazlândia
          </h1>
          <p className="text-lg opacity-90 leading-relaxed">
            Sistema de Prontuário Eletrônico e Acompanhamento Familiar. 
            Facilitando o trabalho técnico para fortalecer vínculos e garantir direitos.
          </p>
        </div>

        {/* Footer Esquerdo */}
        <div className="relative z-10 text-sm opacity-70">
          © {new Date().getFullYear()} GDF • Secretaria de Desenvolvimento Social
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="flex flex-col space-y-2 text-center">
            {/* Ícone Mobile (aparece só se a esquerda estiver oculta) */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">Acesse sua conta</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais institucionais
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Institucional</Label>
                <Input
                  id="email"
                  placeholder="nome@sedes.df.gov.br"
                  type="email"
                  disabled={isLoginLoading}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                </div>
                <Input
                  id="senha"
                  type="password"
                  disabled={isLoginLoading}
                  {...register('senha')}
                  className={errors.senha ? 'border-destructive' : ''}
                />
                {errors.senha && (
                  <p className="text-xs text-destructive">{errors.senha.message}</p>
                )}
              </div>
            </div>

            <Button className="w-full h-11" type="submit" disabled={isLoginLoading}>
              {isLoginLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Problemas de acesso? Contate a <span className="underline underline-offset-4 cursor-pointer hover:text-primary">Gerência</span>.
          </p>
        </div>
      </div>
    </div>
  )
}