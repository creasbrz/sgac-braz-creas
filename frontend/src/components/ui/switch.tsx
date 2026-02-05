// frontend/src/components/ui/switch.tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // LAYOUT & SIZING
      // h-6 w-11 substitui valores arbitrários [24px] e [44px]
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      
      // MOTION
      "transition-colors duration-200",
      
      // FOCUS STATE
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      
      // DISABLED STATE
      "disabled:cursor-not-allowed disabled:opacity-50",
      
      // CHECKED/UNCHECKED STATES
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // THUMB SIZING & STYLE
        // size-5 (20px) encaixa perfeitamente no container h-6 (24px) com bordas
        "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0",
        
        // ANIMATION (Translate X: 20px)
        "transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }