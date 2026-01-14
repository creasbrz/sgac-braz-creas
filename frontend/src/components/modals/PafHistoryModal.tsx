// frontend/src/components/modals/PafHistoryModal.tsx
import { useQuery } from '@tanstack/react-query'
import { format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Loader2, History, AlertCircle, FileText, Target, 
  Lightbulb, Calendar, User, GitCommit} from 'lucide-react'

import { api } from '@/lib/api'
import { PafVersion } from '@/types/case'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface PafHistoryModalProps {
  caseId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// --- HELPER FUNCTIONS ---
const formatDate = (date: string | Date | undefined, formatStr: string = "dd 'de' MMM, yyyy") => {
  if (!date) return '-'
  const d = new Date(date)
  return isValid(d) ? format(d, formatStr, { locale: ptBR }) : '-'
}

// --- SUB-COMPONENTS ---

const EmptyField = () => <span className="text-muted-foreground/60 italic text-xs">Não informado nesta versão.</span>

interface HistoryItemProps {
  version: PafVersion
  versionNumber: number
  isLast: boolean
}

function HistoryItem({ version, versionNumber, isLast }: HistoryItemProps) {
  return (
    <div className="relative pl-8 pb-1">
      {/* Linha da Timeline */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border group-hover:bg-primary/30 transition-colors" />
      )}
      
      {/* Marcador (Dot) */}
      <div className="absolute left-[4px] top-5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background z-10 shadow-sm" />

      <AccordionItem 
        value={version.id} 
        className="border rounded-lg bg-card shadow-sm overflow-hidden transition-all data-[state=open]:ring-1 data-[state=open]:ring-primary/20 mb-4"
      >
        <AccordionTrigger className="px-4 py-3 hover:bg-muted/5 hover:no-underline group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 pr-3">
            <div className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold tracking-wider uppercase text-primary border-primary/20 bg-primary/5">
                  v{versionNumber}
                </Badge>
                <span className="font-semibold text-sm text-foreground">
                  {formatDate(version.savedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.autor?.nome || 'Sistema'}
                </span>
                <span>•</span>
                <span>{formatDate(version.savedAt, 'HH:mm')}h</span>
              </div>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-0 pb-0 border-t bg-muted/5">
          <div className="p-5 space-y-6">
            
            {/* Diagnóstico */}
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                <FileText className="h-3.5 w-3.5" /> Diagnóstico
              </h4>
              <div className="text-sm leading-relaxed p-3 bg-background rounded-md border text-foreground/90 whitespace-pre-wrap">
                {version.diagnostico || <EmptyField />}
              </div>
            </div>

            {/* Objetivos */}
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                <Target className="h-3.5 w-3.5" /> Objetivos
              </h4>
              <div className="text-sm leading-relaxed p-3 bg-background rounded-md border text-foreground/90 whitespace-pre-wrap">
                {version.objetivos || <EmptyField />}
              </div>
            </div>

            {/* Estratégias */}
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                <Lightbulb className="h-3.5 w-3.5" /> Estratégias
              </h4>
              <div className="text-sm leading-relaxed p-3 bg-background rounded-md border text-foreground/90 whitespace-pre-wrap">
                {version.estrategias || <EmptyField />}
              </div>
            </div>

            <Separator />

            {/* Rodapé: Prazo */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>Prazo pactuado nesta versão:</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {formatDate(version.deadline, 'dd/MM/yyyy')}
              </Badge>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  )
}

// --- MAIN COMPONENT ---

export function PafHistoryModal({ caseId, isOpen, onOpenChange }: PafHistoryModalProps) {
  const { data: history, isLoading, isError } = useQuery<PafVersion[]>({
    queryKey: ['paf-history', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/paf/history`)
      return res.data
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos enquanto aberto
  })

  const hasHistory = !!history && history.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/10 z-10 shadow-sm">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="h-5 w-5 text-primary" />
            Histórico do PAF
          </DialogTitle>
          <DialogDescription>
            Linha do tempo das repactuações e alterações do plano.
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden bg-background">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              <p className="text-sm">Carregando versões...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive p-6 text-center">
              <div className="bg-destructive/10 p-3 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Erro ao carregar</p>
                <p className="text-sm opacity-80">Não foi possível recuperar o histórico.</p>
              </div>
            </div>
          ) : !hasHistory ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-3 text-muted-foreground/60">
              <div className="bg-muted/30 p-4 rounded-full">
                <GitCommit className="h-8 w-8 opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Nenhuma versão anterior</p>
                <p className="text-xs max-w-[200px] mt-1">O histórico será criado automaticamente após a primeira repactuação do plano.</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {history.map((version, index) => (
                    <HistoryItem 
                      key={version.id}
                      version={version}
                      versionNumber={history.length - index} // v3, v2, v1...
                      isLast={index === history.length - 1}
                    />
                  ))}
                </Accordion>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}