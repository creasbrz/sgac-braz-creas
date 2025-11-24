import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, History } from 'lucide-react'

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
import type { PafVersion } from '@/types/case'

interface PafHistoryModalProps {
  caseId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function PafHistoryModal({ caseId, isOpen, onOpenChange }: PafHistoryModalProps) {
  const { data: history, isLoading } = useQuery<PafVersion[]>({
    queryKey: ['paf-history', caseId],
    queryFn: async () => {
      const res = await api.get(`/cases/${caseId}/paf/history`)
      return res.data
    },
    enabled: isOpen,
  })

  const hasHistory = !!history && history.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Versões do PAF
          </DialogTitle>
          <DialogDescription>Visualize as versões anteriores arquivadas.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            {!hasHistory ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma versão encontrada. Este é o primeiro PAF.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {history.map((version, index) => {
                  const versaoNumero = history.length - index

                  return (
                    <AccordionItem key={version.id} value={version.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex justify-between w-full items-center pr-4">
                          <div className="text-left">
                            <div className="font-semibold text-sm">
                              Versão #{versaoNumero} —{' '}
                              {format(new Date(version.savedAt), "dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Arquivada por: {version.autor?.nome || 'Sistema'}
                            </div>
                          </div>

                          <Badge variant="outline" className="text-xs font-normal">
                            {format(new Date(version.savedAt), 'HH:mm')}
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="bg-muted/30 p-4 rounded-md space-y-4 text-sm">
                        <section>
                          <strong className="block text-muted-foreground text-xs uppercase mb-1">
                            Diagnóstico
                          </strong>
                          <p className="whitespace-pre-wrap">{version.diagnostico}</p>
                        </section>

                        <section>
                          <strong className="block text-muted-foreground text-xs uppercase mb-1">
                            Objetivos
                          </strong>
                          <p className="whitespace-pre-wrap">{version.objetivos}</p>
                        </section>

                        <section>
                          <strong className="block text-muted-foreground text-xs uppercase mb-1">
                            Estratégias
                          </strong>
                          <p className="whitespace-pre-wrap">{version.estrategias}</p>
                        </section>

                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            Prazo definido nesta versão:{' '}
                          </span>
                          <span className="font-medium">
                            {format(new Date(version.deadline), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
