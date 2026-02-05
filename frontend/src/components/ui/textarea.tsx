// frontend/src/components/ui/textarea.tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // LAYOUT & BASE
          "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          
          // TYPOGRAPHY
          "text-foreground placeholder:text-muted-foreground",
          
          // VISUALS & MOTION
          "shadow-sm transition-colors duration-200",
          
          // FOCUS STATE
          // Mantendo ring-offset-0 para evitar cortes em modais, conforme sua correção anterior
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
          
          // DISABLED STATE
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }