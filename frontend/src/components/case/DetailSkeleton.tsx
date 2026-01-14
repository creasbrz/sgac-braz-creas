// frontend/src/components/case/DetailSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      
      {/* 1. Cabeçalho de Página (Título + Botões de Ação) */}
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-6">
        <div className="space-y-3 w-full max-w-2xl">
          <Skeleton className="h-8 w-1/3 rounded-md" /> {/* Nome do Caso */}
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" /> {/* Badge Status */}
            <Skeleton className="h-5 w-32 rounded-full" /> {/* Badge Urgência */}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" /> {/* Botão Primário */}
          <Skeleton className="h-10 w-10 rounded-md" /> {/* Botão Menu */}
        </div>
      </div>

      {/* 2. Barra de Abas (Tabs) */}
      <div className="flex gap-6 border-b">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-t-lg mb-[-1px]" />
        ))}
      </div>

      {/* 3. Grid de Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda (Principal - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Dados Pessoais */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" /> {/* Label */}
                  <Skeleton className={`h-4 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} /> {/* Valor Variável */}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card de Endereço */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita (Lateral - 1/3) */}
        <div className="space-y-6">
          {/* Card de Contatos */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card de Informações Técnicas */}
          <Card className="h-48">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}