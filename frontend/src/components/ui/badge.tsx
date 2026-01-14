import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* DESIGN SYSTEM NOTES:                                                       */
/* 1. Cores "Subtle" (ex: bg-emerald-500/15) são preferidas para status.      */
/* 2. 'rounded-full' ajuda a diferenciar visualmente Badges de Buttons.       */
/* 3. Adicionado aliases (destructive/secondary) para compatibilidade.        */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // --- STANDARD / COMPATIBILITY ---
        default: 
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        
        secondary: // Alias para 'muted' (padrão shadcn)
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        destructive: // Alias para 'danger' (padrão shadcn)
          "border-transparent bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400",
        
        outline: 
          "text-foreground",
          
        // --- SEMANTIC VARIANTS (Estilo 'Subtle') ---
        
        info: 
          "border-transparent bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:text-blue-400",
        
        success: 
          "border-transparent bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400",
        
        warning: 
          "border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
        
        danger: 
          "border-transparent bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400",
          
        muted: 
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }