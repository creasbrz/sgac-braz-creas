// frontend/src/components/ui/input.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // BASE LAYOUT & TYPOGRAPHY
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background",
          
          // VISUALS & MOTION
          // shadow-sm: Profundidade sutil
          // transition-colors: Suaviza a entrada do foco/border
          "shadow-sm transition-colors duration-200",
          
          // FILE INPUTS
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          
          // PLACEHOLDER
          "placeholder:text-muted-foreground",
          
          // STATES (Focus & Disabled)
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }