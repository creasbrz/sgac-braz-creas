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

// [CORREÇÃO 1] Importando o nome correto do tipo exportado
import { getWhatsAppLink, type WhatsAppTemplateType } from "@/utils/whatsapp"

interface WhatsAppButtonProps extends ButtonProps {
  phone: string | null | undefined
  name?: string
  // [CORREÇÃO 1] Usando o tipo correto
  template?: WhatsAppTemplateType
  data?: Record<string, unknown>
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
  disabled,
  onClick,
  ...props 
}: WhatsAppButtonProps) {

  const isDisabled = !phone || disabled

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (onClick) onClick(e)

    if (!phone) {
      return toast.error("Telefone não cadastrado.")
    }

    // [CORREÇÃO 2] Garantindo que 'nome' tenha um valor de fallback caso venha undefined
    const link = getWhatsAppLink(phone, template, { 
      nome: name || 'Usuário', 
      ...data 
    })
    
    if (!link) {
      return toast.error("Número de telefone inválido.")
    }

    // Abertura segura de link externo
    const newWindow = window.open(link, '_blank', 'noopener,noreferrer')
    if (newWindow) {
      newWindow.opener = null
    }
  }

  // Estilos específicos para a marca WhatsApp (Emerald)
  const isSolid = variant === 'default'
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {/* Wrapper span é necessário para o Tooltip aparecer 
            mesmo quando o botão está disabled 
          */}
          <span className="inline-block" tabIndex={isDisabled ? 0 : -1}>
            <Button 
              variant={variant} 
              size={size} 
              disabled={isDisabled}
              onClick={handleClick}
              className={cn(
                "transition-all duration-200",
                // Estilos para variante Sólida (Default)
                isSolid && !isDisabled && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent hover:shadow-md",
                // Estilos para variante Outline/Ghost
                !isSolid && !isDisabled && "text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
                // Estilos de desabilitado (mantém consistência com UI)
                isDisabled && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                className
              )}
              {...props}
            >
              <MessageCircle className={cn("h-4 w-4 shrink-0", label ? "mr-2" : "")} />
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        
        <TooltipContent side="top">
          <p>{isDisabled ? "Sem telefone registrado" : tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}