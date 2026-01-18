// frontend/src/components/case/DetailSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export function DetailSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl pb-10 space-y-6 animate-pulse">
      
      {/* 1. Header Minimalista (Alinhado com CaseDetail > MinimalHeader) */}
      <div className="flex flex-col gap-4 pt-2">
        {/* Topo: Voltar + Botões de Ação */}
        <div className="flex items-center justify-between">
           <Skeleton className="h-4 w-20" /> {/* Botão Voltar */}
           <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" /> {/* PDF */}
              <Skeleton className="h-9 w-24" /> {/* Editar */}
           </div>
        </div>

        {/* Informações Principais */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           {/* Avatar Box */}
           <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded-xl shrink-0" />
           
           <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                 <Skeleton className="h-8 w-64 rounded-md" /> {/* Nome */}
                 <Skeleton className="h-6 w-24 rounded-full" /> {/* Badge Status */}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                 <Skeleton className="h-4 w-32" /> {/* CPF */}
                 <Skeleton className="h-4 w-32" /> {/* Nascimento */}
                 <Skeleton className="h-5 w-20 rounded-full" /> {/* Origem */}
              </div>
           </div>

           {/* Workflow Actions */}
           <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>

      {/* 2. Workflow Bar */}
      <Skeleton className="h-24 w-full rounded-xl opacity-50" />

      {/* 3. Tabs List */}
      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto pb-2">
           {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
           ))}
        </div>
      </div>

      {/* 4. Grid Principal (Layout 9 + 3 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6">
        
        {/* Coluna Principal (9/12) */}
        <div className="lg:col-span-9 space-y-6">
           {/* Cards de Métricas (Overview) */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
           </div>
           
           {/* Card de Conteúdo Genérico */}
           <Card>
             <CardHeader className="pb-2">
               <Skeleton className="h-6 w-48" />
             </CardHeader>
             <CardContent className="space-y-4 pt-4">
               <div className="space-y-2">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-5/6" />
                 <Skeleton className="h-4 w-4/6" />
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Sidebar Lateral (3/12) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
           <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-3 px-4 border-b bg-muted/20">
                 <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-4 space-y-5">
                 {/* Item Sidebar */}
                 <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full" />
                 </div>
                 <Separator />
                 {/* Item Sidebar com Ícone */}
                 <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <div className="flex gap-2">
                       <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                       <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </aside>

      </div>
    </div>
  )
}