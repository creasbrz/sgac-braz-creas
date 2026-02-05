// frontend/src/pages/NotFound.tsx
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-background overflow-hidden">
      
      {/* Background Decorativo (Grid + Glow) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>

      <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-md">
        
        {/* Ícone e Badge */}
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 shadow-sm">
            <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-3 -right-3 bg-background border border-border px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm text-muted-foreground">
            Erro 404
          </div>
        </div>
        
        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Página não encontrada
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            O recurso que você tentou acessar não existe, foi movido ou você não tem permissão para visualizá-lo.
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => navigate(-1)}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Button 
            asChild 
            size="lg" 
            className="gap-2 w-full sm:w-auto shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link to="/app/workspace"> {/* Ajustado para rota comum de app */}
              <Home className="h-4 w-4" />
              Ir para o Início
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Footer Discreto */}
      <div className="absolute bottom-6 text-[10px] text-muted-foreground/40 font-mono">
        SGAC • SEDES/DF
      </div>
    </div>
  );
}