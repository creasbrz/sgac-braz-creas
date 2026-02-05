// frontend/src/components/case/DetailSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export function DetailSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl pb-10 space-y-8 animate-pulse px-4 md:px-8">
      
      {/* 1. Header Minimalista */}
      <div className="flex flex-col gap-4 pt-2">
        {/* Topo: Voltar + Ações */}
        <div className="flex items-center justify-between">
           <Skeleton className="h-8 w-24 rounded-md" /> {/* Botão Voltar */}
           <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" /> {/* PDF */}
              <Skeleton className="h-8 w-24 rounded-md" /> {/* Editar */}
           </div>
        </div>

        {/* Informações Principais do Caso */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
           {/* Avatar */}
           <Skeleton className="h-14 w-14 md:h-16 md:w-16 rounded-xl shrink-0" />
           
           <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                 <Skeleton className="h-8 w-64 rounded-md bg-muted/60" /> {/* Nome */}
                 <Skeleton className="h-6 w-28 rounded-full" /> {/* Status Badge */}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 pt-1">
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-4 w-32" /> {/* CPF */}
                 </div>
                 <Skeleton className="h-4 w-4 hidden md:block rounded-full opacity-20" /> {/* Separador */}
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-3.5 rounded-full" />
                    <Skeleton className="h-4 w-32" /> {/* Nascimento */}
                 </div>
                 <Skeleton className="h-4 w-4 hidden md:block rounded-full opacity-20" />
                 <Skeleton className="h-5 w-24 rounded-md" /> {/* Origem Badge */}
              </div>
           </div>

           {/* Workflow Actions Placeholders */}
           <div className="w-full md:w-auto mt-2 md:mt-0">
              <Skeleton className="h-9 w-40 rounded-md" />
           </div>
        </div>
      </div>

      {/* 2. Workflow Bar (Status Steps) */}
      <div className="w-full h-24 rounded-xl border border-border/40 bg-card p-4 flex items-center justify-between gap-4">
         {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
               <Skeleton className="h-8 w-8 rounded-full" />
               <Skeleton className="h-2 w-full max-w-20" />
            </div>
         ))}
      </div>

      {/* 3. Tabs List Sticky */}
      <div className="sticky top-0 z-30 bg-background/95 py-3 border-b -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
           {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full shrink-0" />
           ))}
        </div>
      </div>

      {/* 4. Grid Principal (Layout 9 + 3 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        
        {/* Coluna Principal (Conteúdo das Abas) */}
        <div className="lg:col-span-9 space-y-6">
           {/* Cards de Métricas (Overview Simulation) */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-xl border border-border/50" />
              <Skeleton className="h-32 rounded-xl border border-border/50" />
              <Skeleton className="h-32 rounded-xl border border-border/50" />
           </div>
           
           {/* Card de Conteúdo Genérico */}
           <Card className="border-border/60">
             <CardHeader className="pb-4 border-b border-border/40">
               <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                     <Skeleton className="h-5 w-48" />
                     <Skeleton className="h-3 w-32" />
                  </div>
               </div>
             </CardHeader>
             <CardContent className="space-y-6 pt-6">
               <div className="space-y-3">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-[90%]" />
                 <Skeleton className="h-4 w-[95%]" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Sidebar Lateral (Informações Rápidas) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24">
           <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-3 px-4 border-b bg-muted/20 flex items-center justify-between">
                 <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-4 space-y-6">
                 {/* Responsável */}
                 <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <div className="pl-2 border-l-2 border-muted">
                       <Skeleton className="h-4 w-40 mb-1" />
                       <Skeleton className="h-3 w-20" />
                    </div>
                 </div>
                 
                 <Separator className="opacity-50" />
                 
                 {/* Contatos */}
                 <div className="space-y-3">
                    <Skeleton className="h-3 w-16" />
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                          <div className="space-y-1 flex-1">
                             <Skeleton className="h-3 w-full" />
                             <Skeleton className="h-2 w-16" />
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                          <div className="space-y-1 flex-1">
                             <Skeleton className="h-3 w-full" />
                             <Skeleton className="h-2 w-16" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <Separator className="opacity-50" />

                 {/* Endereço */}
                 <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                 </div>
              </div>
           </div>
        </aside>

      </div>
    </div>
  )
}