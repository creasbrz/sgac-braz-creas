// frontend/src/components/case/CaseContactList.tsx
import { Phone, User, Home, Briefcase, Users, HelpCircle, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Tipagem básica
interface Contact {
  numero: string
  tipo: string
  nome?: string
  observacao?: string
}

interface CaseContactListProps {
  contatos?: Contact[]
  telefoneAntigo?: string | null
}

const getIcon = (tipo: string) => {
  switch (tipo) {
    case 'Pessoal': return <Phone className="h-3 w-3" />
    case 'Residencial': return <Home className="h-3 w-3" />
    case 'Trabalho': return <Briefcase className="h-3 w-3" />
    case 'Vizinho': return <Users className="h-3 w-3" />
    case 'Parente': return <User className="h-3 w-3" />
    default: return <HelpCircle className="h-3 w-3" />
  }
}

// Estilos semânticos para os badges baseados no tipo
const getBadgeStyles = (tipo: string) => {
  switch (tipo) {
    case 'Pessoal': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    case 'Residencial': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    case 'Trabalho': return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    case 'Vizinho': return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
    case 'Parente': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

export function CaseContactList({ contatos, telefoneAntigo }: CaseContactListProps) {
  // Lógica original de compatibilidade
  const listaContatos = Array.isArray(contatos) && contatos.length > 0
    ? contatos
    : (telefoneAntigo ? [{ numero: telefoneAntigo, tipo: 'Pessoal', nome: 'Contato Principal (Antigo)' }] : [])

  const handleWhatsApp = (numero: string) => {
    const cleanNum = numero.replace(/\D/g, '')
    window.open(`https://wa.me/55${cleanNum}`, '_blank')
  }

  if (listaContatos.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border/60 bg-muted/5 text-muted-foreground text-xs italic justify-center">
        <Phone className="h-3.5 w-3.5 opacity-50" />
        Nenhum contato registrado.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {listaContatos.map((c, idx) => (
        <div 
          key={idx} 
          className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 transition-all duration-200 group shadow-sm hover:shadow-md"
        >
          {/* [CORREÇÃO] Removido 'overflow-hidden' e adicionado 'min-w-0' para evitar corte */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Badge de Tipo */}
            <div className="mt-0.5 shrink-0">
               <Badge 
                 variant="outline" 
                 className={cn("gap-1.5 px-2 h-5 text-[10px] font-medium border shadow-none", getBadgeStyles(c.tipo))}
               >
                 {getIcon(c.tipo)} {c.tipo}
               </Badge>
            </div>
            
            {/* Informações do Contato */}
            <div className="flex flex-col min-w-0 gap-0.5 flex-1">
              {/* [CORREÇÃO] Removido 'whitespace-nowrap', adicionado 'break-words' */}
              <span className="text-sm font-semibold tracking-tight text-foreground font-mono leading-tight wrap-break-word">
                {c.numero}
              </span>
              
              {(c.nome || c.observacao) && (
                <div className="flex flex-col">
                  {c.nome && <span className="text-xs text-foreground/80 font-medium wrap-break-word leading-tight">{c.nome}</span>}
                  {c.observacao && <span className="text-[10px] text-muted-foreground italic wrap-break-word leading-tight mt-0.5">{c.observacao}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Botão de Ação (WhatsApp) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 shrink-0 ml-2 rounded-full transition-colors" 
                  onClick={() => handleWhatsApp(c.numero)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs bg-green-600 text-white border-green-700">
                Iniciar conversa no WhatsApp
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}
    </div>
  )
}