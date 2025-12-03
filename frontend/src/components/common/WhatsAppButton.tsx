// frontend/src/components/common/WhatsAppButton.tsx
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getWhatsAppLink, type MessageTemplate } from "@/utils/whatsapp"
import { toast } from "sonner"

interface WhatsAppButtonProps {
  phone: string
  name?: string
  template?: MessageTemplate
  data?: any
  // [CORREÇÃO] Removido "icon" daqui, pois não é uma variante válida de botão
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
}

export function WhatsAppButton({ 
  phone, 
  name, 
  template = 'geral', 
  data, 
  variant = "outline", 
  size = "sm",
  label
}: WhatsAppButtonProps) {

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!phone) {
      toast.error("Telefone não cadastrado.")
      return
    }

    const link = getWhatsAppLink(phone, template, { nome: name, ...data })
    
    if (!link) {
      toast.error("Número de telefone inválido para WhatsApp.")
      return
    }

    window.open(link, '_blank')
  }

  if (!phone) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={variant === 'default' ? "bg-green-600 hover:bg-green-700 text-white" : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"}
            onClick={handleClick}
          >
            <MessageCircle className={`h-4 w-4 ${label ? 'mr-2' : ''}`} />
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