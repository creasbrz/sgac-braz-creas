import React from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { cn } from "@/lib/utils" // Importante para mesclar classes

// Importa a lógica e o tipo do arquivo que você criou
import { getWhatsAppLink, type MessageTemplate } from "@/utils/whatsapp"

interface WhatsAppButtonProps {
  phone: string
  name?: string
  template?: MessageTemplate
  data?: any
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
  className?: string // [CORREÇÃO] Adicionada prop className para evitar erro de build TS2322
}

export function WhatsAppButton({ 
  phone, 
  name, 
  template = 'geral', 
  data, 
  variant = "outline", 
  size = "sm",
  label,
  className
}: WhatsAppButtonProps) {

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!phone) {
      toast.error("Telefone não cadastrado.")
      return
    }

    // Usa a função do utilitário
    const link = getWhatsAppLink(phone, template, { nome: name, ...data })
    
    if (!link) {
      toast.error("Número de telefone inválido.")
      return
    }

    window.open(link, '_blank')
  }

  if (!phone) return null

  // Estilos base padrão
  const defaultStyles = variant === 'default' 
    ? "bg-green-600 hover:bg-green-700 text-white border-transparent" 
    : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            // Mescla os estilos padrão com o className recebido via prop
            className={cn(defaultStyles, className)}
            onClick={handleClick}
          >
            <MessageCircle className={cn("h-4 w-4", label && "mr-2")} />
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Enviar mensagem no WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}