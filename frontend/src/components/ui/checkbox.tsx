// frontend/src/components/ui/checkbox.tsx
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
      // BASE LAYOUT
      // 'size-4' (16px) é o padrão para interfaces densas/desktop.
      // 'rounded-sm' diferencia visualmente de Radio Buttons.
      "peer size-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      
      // STATES
      // Unchecked: Fundo transparente/background.
      // Checked: Fundo primário, Texto claro.
      "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      {/* MICRO-INTERAÇÃO:
         O ícone tem um 'zoom in' rápido ao ser marcado.
         strokeWidth={3} garante legibilidade em tamanhos pequenos.
      */}
      <Check 
        className="size-3.5 animate-in zoom-in-50 duration-200" 
        strokeWidth={3} 
      />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }