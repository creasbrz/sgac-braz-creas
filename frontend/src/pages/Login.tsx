// frontend/src/pages/Login.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Loader2, ArrowRight, ShieldCheck, AlertCircle, 
  Mail, Lock, Eye, EyeOff 
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GdfLogo } from '@/components/layout/GdfLogo'

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- SCHEMA ---
const loginFormSchema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
})

type LoginFormData = z.infer<typeof loginFormSchema>

export function Login() {
  const { login, isLoginLoading } = useAuth()
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  // UX State: Toggle Password Visibility
  const [showPassword, setShowPassword] = useState(false)

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
      setGlobalError("Credenciais inválidas ou usuário não autorizado.")
    }
  }

  return (
    <div className="w-full min-h-screen flex items-stretch overflow-hidden bg-background">
      
      {/* LADO ESQUERDO: Institucional (Desktop) */}
      <div className="hidden lg:flex w-1/2 relative bg-primary flex-col justify-between p-12 text-primary-foreground overflow-hidden">
        {/* Background Pattern Sutil */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-900/50" />
        
        {/* Decorative Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

        {/* Header Esquerdo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
            <GdfLogo className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wider uppercase opacity-90">SEDES/DF</span>
            <span className="text-[10px] opacity-70 leading-none">Governo do Distrito Federal</span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Gestão Integrada <br/>
            <span className="text-blue-200">CREAS Brazlândia</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed font-light">
            Sistema de Prontuário Eletrônico e Acompanhamento Familiar. 
            Tecnologia a serviço do fortalecimento de vínculos e garantia de direitos.
          </p>
        </div>

        {/* Footer Esquerdo */}
        <div className="relative z-10 flex items-center gap-4 text-sm opacity-60">
          <span>© {new Date().getFullYear()} SEDES</span>
          <span className="h-1 w-1 rounded-full bg-current" />
          <span>Proteção Social Especial</span>
        </div>
      </div>

      {/* LADO DIREITO: Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Header Mobile (Logo) */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
           <GdfLogo className="h-8 w-8 text-primary" />
           <span className="font-bold text-primary">SGAC</span>
        </div>

        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          
          <div className="flex flex-col space-y-2 text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 lg:hidden">
              <ShieldCheck className="h-6 w-6" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Insira suas credenciais para acessar o painel
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Tratamento de Erro Global */}
            {globalError && (
              <Alert variant="destructive" className="animate-in fade-in zoom-in-95 border-destructive/50 bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{globalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Campo E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email" className={cn(errors.email && "text-destructive")}>E-mail Institucional</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    placeholder="nome@sedes.df.gov.br"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    disabled={isLoginLoading}
                    {...register('email')}
                    className={cn(
                      "pl-10 h-11 transition-all", // Espaço para o ícone
                      errors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className={cn(errors.senha && "text-destructive")}>Senha</Label>
                  {/* Link opcional de recuperação de senha futuramente */}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={isLoginLoading}
                    {...register('senha')}
                    className={cn(
                      "pl-10 pr-10 h-11 transition-all", // Espaço para ícones
                      errors.senha && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground/60 hover:text-foreground focus:outline-none focus:text-primary transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">
                    {errors.senha.message}
                  </p>
                )}
              </div>
            </div>

            <Button 
              className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
              type="submit" 
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Mobile/Desktop */}
          <div className="text-center space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Problemas de acesso? <br/>
              <button 
                type="button" 
                className="font-medium text-primary hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                onClick={() => window.location.href = 'mailto:suporte@sedes.df.gov.br'} // Exemplo de ação
              >
                Contatar Suporte Técnico
              </button>
            </p>
          </div>
        </div>
        
        {/* Footer Discreto Direita */}
        <div className="absolute bottom-4 text-[10px] text-muted-foreground/40 text-center w-full">
          Ambiente Seguro • SSL Encrypted
        </div>
      </div>
    </div>
  )
}