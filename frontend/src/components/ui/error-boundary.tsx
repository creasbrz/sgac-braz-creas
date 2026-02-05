// frontend/src/components/ui/error-boundary.tsx
import { Component, ErrorInfo, ReactNode, useState } from "react"
import { AlertTriangle, Home, RefreshCw, Copy, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

/* -------------------------------------------------------------------------- */
/* 1. INTERFACES & PROPS                                                      */
/* -------------------------------------------------------------------------- */

interface Props {
  children?: ReactNode
  fallback?: ReactNode // Permite injetar uma UI de erro customizada
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/* -------------------------------------------------------------------------- */
/* 2. COMPONENTE DE UI (Functional - Apresentação)                            */
/* -------------------------------------------------------------------------- */

const ErrorState = ({ error, reset }: { error: Error | null, reset: () => void }) => {
  const [copied, setCopied] = useState(false)
  const isDev = import.meta.env.MODE === 'development'

  const handleCopyError = () => {
    if (error) {
      navigator.clipboard.writeText(`${error.name}: ${error.message}\n\n${error.stack}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReload = () => window.location.reload()
  const handleHome = () => window.location.href = '/'

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-lg shadow-xl border-destructive/10 bg-background/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Algo não saiu como esperado</CardTitle>
          <CardDescription className="text-base mt-2">
            Encontramos um erro crítico que impediu o carregamento desta seção.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Mensagem Amigável */}
          <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground text-center">
            Nossa equipe foi notificada. Tente recarregar a página ou voltar para o início.
          </div>

          {/* Área Técnica (Expansível) */}
          {error && (
            <details className="group rounded-lg border border-border text-left text-sm">
              <summary className="flex cursor-pointer items-center justify-between rounded-t-lg bg-muted/30 px-4 py-2 font-medium transition-colors hover:bg-muted/50 group-open:border-b">
                <span className="text-destructive font-mono">Detalhes do Erro {isDev ? '(Debug)' : ''}</span>
                <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {isDev ? 'Clique para ver' : 'Apenas técnicos'}
                </span>
              </summary>
              <div className="relative bg-slate-950 p-4 font-mono text-xs text-slate-50 dark:bg-black">
                <div className="absolute right-2 top-2">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={handleCopyError}
                    title="Copiar Log"
                   >
                     {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                   </Button>
                </div>
                {/* [CORREÇÃO] max-h-[200px] -> max-h-50 */}
                <div className="overflow-auto max-h-50 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                  <p className="font-bold text-red-400 mb-2">{error.toString()}</p>
                  <pre className="opacity-70 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                </div>
              </div>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2 pb-8">
          {/* [CORREÇÃO] min-w-[140px] -> min-w-35 */}
          <Button onClick={reset} variant="default" className="w-full sm:w-auto min-w-35">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
          
          <div className="flex gap-3 w-full sm:w-auto">
             <Button onClick={handleReload} variant="outline" className="flex-1 sm:w-auto">
               Recarregar
             </Button>
             <Button onClick={handleHome} variant="ghost" className="flex-1 sm:w-auto">
               <Home className="mr-2 h-4 w-4" />
               Início
             </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. LOGIC CONTROLLER (Class Component)                                      */
/* -------------------------------------------------------------------------- */

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorState error={this.state.error} reset={this.handleReset} />
    }

    return this.props.children
  }
}

export default ErrorBoundary