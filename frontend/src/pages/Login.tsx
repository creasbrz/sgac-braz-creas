import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GdfLogo } from '@/components/layout/GdfLogo'

const loginFormSchema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
})

type LoginFormData = z.infer<typeof loginFormSchema>

export function Login() {
  const { login, isLoginLoading } = useAuth()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
  })

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setGlobalError(null)
    try {
      await login(data)
    } catch (error) {
      console.error(error)
      // Mensagem institucional padronizada
      setGlobalError("Credenciais inválidas ou usuário não autorizado.")
    }
  }

  return (
    <div className="w-full min-h-screen flex items-stretch overflow-hidden">
      
      {/* LADO ESQUERDO: Institucional */}
      <div className="hidden lg:flex w-1/2 relative bg-primary flex-col justify-between p-12 text-primary-foreground overflow-hidden">
        {/* Padrão de fundo CSS Puro (Sem dependência externa) */}
        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
             }}
        ></div>
        
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
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-4 right-4 text-xs text-muted-foreground hidden sm:block">
          Acesso restrito a servidores autorizados.
        </div>

        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="flex flex-col space-y-2 text-center">
            {/* Ícone Mobile */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight">Acesso ao Sistema</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais institucionais
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {globalError && (
              <Alert variant="destructive" className="animate-in fade-in zoom-in-95">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Institucional</Label>
                <Input
                  id="email"
                  placeholder="nome@sedes.df.gov.br"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  disabled={isLoginLoading}
                  {...register('email')}
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                </div>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoginLoading}
                  {...register('senha')}
                  className={errors.senha ? 'border-destructive focus-visible:ring-destructive' : ''}
                  aria-invalid={!!errors.senha}
                />
                {errors.senha && (
                  <p className="text-xs text-destructive font-medium">{errors.senha.message}</p>
                )}
              </div>
            </div>

            <Button className="w-full h-11 shadow-sm" type="submit" disabled={isLoginLoading}>
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Problemas de acesso? Procure a <span className="font-medium text-foreground underline underline-offset-4 cursor-pointer hover:text-primary transition-colors">Gerência da Unidade</span>.
          </p>
        </div>
      </div>
    </div>
  )
}