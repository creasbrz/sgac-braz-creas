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

// Tipagem básica
interface CaseContactListProps {
  contatos?: any
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

const getBadgeVariant = (tipo: string) => {
  switch (tipo) {
    case 'Pessoal': return 'default'
    case 'Vizinho': return 'secondary'
    case 'Trabalho': return 'outline'
    default: return 'outline'
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
    return <span className="text-sm text-muted-foreground italic">Nenhum contato registrado.</span>
  }

  return (
    <div className="flex flex-col gap-2">
      {listaContatos.map((c: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors group">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="mt-1">
               <Badge variant={getBadgeVariant(c.tipo)} className="gap-1 px-1.5 h-5 text-[10px]">
                 {getIcon(c.tipo)} {c.tipo}
               </Badge>
            </div>
            
            <div className="flex flex-col min-w-0">
              {/* [AJUSTE] Adicionado 'whitespace-nowrap' para não quebrar a linha do número */}
              <span className="text-sm font-medium tracking-tight whitespace-nowrap">
                {c.numero}
              </span>
              
              {c.nome && <span className="text-xs text-muted-foreground truncate">{c.nome}</span>}
              {c.observacao && <span className="text-[10px] text-muted-foreground/70 truncate italic">{c.observacao}</span>}
            </div>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 shrink-0 ml-2" // shrink-0 evita esmagar o botão
                  onClick={() => handleWhatsApp(c.numero)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir WhatsApp</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}
    </div>
  )
}