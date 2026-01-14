import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // LAYOUT & DIMENSIONS
      // Aumentado para h-5 w-5 (20px) para melhor hit-area
      "peer h-5 w-5 shrink-0 rounded-md border shadow-sm",
      
      // COLORS & STATES
      // Padrão: border-input (neutro). Checked: bg-primary + border-primary.
      "border-input bg-background ring-offset-background transition-colors",
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
      
      // FOCUS & A11Y
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      
      // DISABLED
      "disabled:cursor-not-allowed disabled:opacity-50",
      
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        "flex items-center justify-center text-current",
        // MICRO-INTERAÇÃO: O ícone surge com um zoom rápido e suave
        "animate-in zoom-in-50 duration-200"
      )}
    >
      {/* Icon adjustments:
         1. h-3.5 w-3.5: Um pouco menor que a caixa para dar respiro (whitespace).
         2. strokeWidth={3.5}: Traço mais grosso para melhor leitura em fundo colorido.
      */}
      <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }