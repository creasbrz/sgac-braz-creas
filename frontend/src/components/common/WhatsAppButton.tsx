// frontend/src/components/common/WhatsAppButton.tsx
import React from "react"
import { MessageCircle } from "lucide-react"
import { toast } from "sonner"

import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { getWhatsAppLink, type MessageTemplate } from "@/utils/whatsapp"

// Estende as props do Button nativo do Shadcn para aceitar 'disabled', 'type', etc.
interface WhatsAppButtonProps extends ButtonProps {
  phone: string | null | undefined
  name?: string
  template?: MessageTemplate
  data?: Record<string, any> // Tipagem mais segura que 'any'
  label?: string
  tooltipText?: string
}

export function WhatsAppButton({ 
  phone, 
  name, 
  template = 'geral', 
  data, 
  className,
  variant = "outline",
  size = "sm",
  label,
  tooltipText = "Conversar no WhatsApp",
  ...props // Captura outras props (onClick opcional, disabled, etc.)
}: WhatsAppButtonProps) {

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Impede que o clique propague para a linha da tabela ou card pai
    e.stopPropagation()

    // Se houver um onClick passado via props, executa ele também
    if (props.onClick) props.onClick(e)

    if (!phone) {
      toast.error("Telefone não cadastrado.")
      return
    }

    const link = getWhatsAppLink(phone, template, { nome: name, ...data })
    
    if (!link) {
      toast.error("Número de telefone inválido.")
      return
    }

    window.open(link, '_blank')
  }

  // Se não tiver telefone, renderizamos desabilitado ou null (dependendo da sua regra de negócio)
  // Aqui optei por renderizar desabilitado para o usuário saber que a opção existe mas falta dados.
  const isDisabled = !phone || props.disabled

  // Definição de estilos baseados na variante para parecer com WhatsApp
  const whatsappStyles = variant === 'default' 
    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" // Estilo Sólido
    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" // Estilo Outline/Ghost

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={cn(
              "transition-colors", 
              !isDisabled && whatsappStyles, 
              className
            )}
            onClick={handleClick}
            disabled={isDisabled}
            {...props}
          >
            <MessageCircle className={cn("h-4 w-4 shrink-0", label ? "mr-2" : "")} />
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isDisabled ? "Sem telefone registrado" : tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}