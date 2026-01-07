import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Ícone de Alerta com Cores do Tema (Destructive para Erro) */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      </div>
      
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        Página não encontrada
      </h1>
      
      <p className="mt-4 max-w-lg text-lg text-muted-foreground">
        A página solicitada não foi encontrada ou pode ter sido removida.
        Verifique o endereço digitado ou retorne à página inicial.
      </p>

      <div className="mt-8">
        {/* Botão com sombra e tamanho adequado para CTA único */}
        <Button asChild size="lg" className="gap-2 shadow-md">
          <Link to="/dashboard">
            <Home className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}