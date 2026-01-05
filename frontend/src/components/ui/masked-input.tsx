import * as React from "react"
import { IMaskInput } from "react-imask"
import { cn } from "@/lib/utils"

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string | object
  onAccept?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  // Permite passar definições customizadas se necessário
  definitions?: any
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, onAccept, onChange, ...props }, ref) => {
    return (
      <IMaskInput
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        mask={mask}
        unmask={true} // Limpa a formatação ao enviar para o state do React
        onAccept={(value: any) => {
          if (onChange) onChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
          if (onAccept) onAccept(value)
        }}
        inputRef={ref as any} 
        {...props as any}
      />
    )
  }
)
MaskedInput.displayName = "MaskedInput"
export { MaskedInput }