// frontend/src/components/ui/skeleton.tsx
import * as React from "react" // Importação explícita para segurança de tipagem
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // 'animate-pulse' cria o efeito de carregamento.
        // 'bg-muted' adapta-se melhor a temas dark/light do que 'bg-muted/50'.
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }