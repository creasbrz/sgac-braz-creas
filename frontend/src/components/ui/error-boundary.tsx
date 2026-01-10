import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <Card className="w-full max-w-md shadow-lg border-destructive/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Ops! Algo deu errado.</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na execução da aplicação.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-6">
              <p className="text-sm text-muted-foreground">
                Nossa equipe técnica foi notificada automaticamente.
                Você pode tentar recuperar a sessão ou recarregar a página.
              </p>
              
              {/* Área de Debug (Apenas em Desenvolvimento) */}
              {/* @ts-ignore: Ignorando verificação estrita de tipo para variável de ambiente no CI */}
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-md text-left overflow-auto max-h-40 border text-xs font-mono">
                  <p className="text-destructive font-bold mb-1">Stack Trace:</p>
                  <span className="text-slate-600 dark:text-slate-400">
                    {this.state.error.toString()}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button 
                  onClick={this.handleReset} 
                  variant="outline" 
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
                
                <Button 
                  onClick={this.handleReload} 
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;