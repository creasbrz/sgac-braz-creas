// Removi o "React" do início, mantendo apenas os tipos e classes necessários
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button'; 
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md shadow-lg border-red-100">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-800">Ops! Algo deu errado.</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada (via console).
                Por favor, tente recarregar a página.
              </p>
              
              {/* Mostra o erro técnico apenas em desenvolvimento */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-gray-100 p-2 rounded text-xs text-left overflow-auto max-h-32 text-red-800 font-mono">
                  {this.state.error.toString()}
                </div>
              )}

              <Button onClick={this.handleReload} className="w-full bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;