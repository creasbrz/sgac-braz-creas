import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
        <AlertTriangle className="h-10 w-10 text-orange-600" />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        404 - Página não encontrada
      </h1>
      
      <p className="mt-4 max-w-lg text-lg text-gray-500">
        Desculpe, a página que você está procurando não existe ou foi movida.
      </p>

      <div className="mt-8">
        {/* CORREÇÃO DO ERRO: 
           Ao usar 'asChild', o Button deve envolver EXATAMENTE um filho.
           O Link passa a ser o elemento raiz renderizado.
        */}
        <Button asChild className="gap-2">
          <Link to="/dashboard">
            <Home className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}