// frontend/src/pages/NotFound.tsx
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes' //
import { Button } from '@/components/ui/button' //
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card' //

export function NotFound() {
  return (
    // CORREÇÃO 1: Usa 'min-h-screen' para centralizar na tela inteira
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center shadow-md"> {/* */}
        <CardHeader> {/* */}
          <CardTitle className="text-4xl font-bold text-destructive">404</CardTitle> {/* */}
        </CardHeader>
        <CardContent> {/* */}
          <p className="mt-2 text-lg text-muted-foreground">
            Página não encontrada.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A página que você procura não existe ou foi movida.
          </p>

          {/* CORREÇÃO 2: Usa o padrão 'asChild' do Shadcn/ui */}
          <Button asChild className="mt-6 w-full">
            <Link to={ROUTES.DASHBOARD}>Voltar para o Painel</Link> {/* */}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}