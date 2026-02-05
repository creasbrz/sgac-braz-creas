// frontend/src/components/ui/masked-input.tsx
import * as React from "react"
import { IMaskInput } from "react-imask"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string | object
  unmask?: boolean // Padrão: true (Retorna o valor cru/raw)
  onAccept?: (value: string, mask: any) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  definitions?: any
  // Radix/Shadcn pattern: asChild não é suportado aqui pois IMaskInput é o wrapper
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, unmask = true, onAccept, onChange, ...props }, ref) => {
    return (
      <IMaskInput
        // Ref forwarding para o elemento input interno do IMask
        inputRef={ref as React.RefObject<HTMLInputElement>}
        
        // Configuração da Máscara
        mask={mask}
        unmask={unmask} // 'true' remove formatação (ex: '12345678900'), 'false' mantém (ex: '123.456.789-00')
        
        // Estilização: Cópia exata do componente Input padrão para consistência
        className={cn(
          // Layout & Typography
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background",
          // File Inputs
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Visuals & Motion
          "shadow-sm transition-colors duration-200",
          // States
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        
        // Event Handling: Adapta o evento do IMask para o padrão React/HTML
        onAccept={(value: string, maskRef: any) => {
          if (onChange) {
            // Cria um evento sintético para bibliotecas como React Hook Form
            const event = {
              target: {
                name: props.name,
                value: value,
              },
            } as React.ChangeEvent<HTMLInputElement>
            
            onChange(event)
          }
          
          if (onAccept) {
            onAccept(value, maskRef)
          }
        }}
        
        {...props as any}
      />
    )
  }
)

MaskedInput.displayName = "MaskedInput"

export { MaskedInput }