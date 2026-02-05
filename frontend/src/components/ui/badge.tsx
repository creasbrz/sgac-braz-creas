// frontend/src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* DESIGN SYSTEM: BADGES                                                      */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        // --- 1. UI VARIANTS (Hierarquia) ---
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        
        outline:
          "text-foreground",

        // --- 2. SEMANTIC VARIANTS (Status - Estilo 'Subtle') ---
        // Usamos opacidade no BG (/15) para manter harmonia com o tema
        
        success:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-400 hover:bg-emerald-500/25",
        
        warning:
          "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-400 hover:bg-amber-500/25",
        
        info:
          "border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400 hover:bg-blue-500/25",
        
        danger:
          "border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-400 hover:bg-red-500/25",
          
        neutral:
          "border-transparent bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-400 hover:bg-slate-500/25",
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