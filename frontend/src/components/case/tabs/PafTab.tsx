// frontend/src/components/case/tabs/PafTab.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { 
  Loader2, Edit, History, PlusCircle, Lock, 
  FileText, Target, Lightbulb, Calendar, Save, X 
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { pafFormSchema } from '@/schemas/caseSchemas'
import { formatDateSafe } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from '@/components/ui/card'

import { PafHistoryModal } from '@/components/modals/PafHistoryModal'
import { usePaf } from '@/hooks/api/useCaseQueries'
import type { CaseDetailData, PafData } from '@/types/case'

// [NOVO] Imports de PDF
import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { PafDoc } from '@/components/reports/templates/PafDoc'

type PafFormData = z.infer<typeof pafFormSchema>

// Helper para data de input (YYYY-MM-DD)
const formatDateForInput = (date: Date | string | undefined) => {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

// --- SUB-COMPONENTE: FORMULÁRIO ---
function PafForm({ caseId, existingPaf, onClose }: { caseId: string, existingPaf: PafData | null, onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      diagnostico: existingPaf?.diagnostico ?? '',
      objetivos: existingPaf?.objetivos ?? '',
      estrategias: existingPaf?.estrategias ?? '',
      deadline: formatDateForInput(existingPaf?.deadline),
    },
  })

  const { mutate: savePaf, isPending } = useMutation({
    mutationFn: async (data: PafFormData) => {
      // Ajusta data para ISO string completa
      const payload = { ...data, deadline: new Date(data.deadline).toISOString() }
      return existingPaf 
        ? api.put(`/cases/${caseId}/paf`, payload) 
        : api.post(`/cases/${caseId}/paf`, payload)
    },
    onSuccess: () => {
      toast.success(existingPaf ? 'PAF repactuado com sucesso!' : 'PAF elaborado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['paf', caseId] })
      queryClient.invalidateQueries({ queryKey: ['paf-history', caseId] })
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Falha ao salvar o PAF.')),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => savePaf(d))} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        <div className="grid grid-cols-1 gap-6">
          <FormField control={form.control} name="diagnostico" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider">
                <FileText className="h-4 w-4" /> Diagnóstico Sociofamiliar
              </FormLabel>
              <FormControl>
                <Textarea 
                  rows={4} 
                  className="resize-y min-h-25 bg-background border-border focus-visible:ring-primary/20" 
                  placeholder="Descreva a situação atual da família..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="objetivos" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider">
                  <Target className="h-4 w-4" /> Objetivos
                </FormLabel>
                <FormControl>
                  <Textarea 
                    rows={5} 
                    className="resize-none bg-background border-border focus-visible:ring-primary/20" 
                    placeholder="Quais metas devem ser alcançadas?" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="estrategias" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4" /> Estratégias
                </FormLabel>
                <FormControl>
                  <Textarea 
                    rows={5} 
                    className="resize-none bg-background border-border focus-visible:ring-primary/20" 
                    placeholder="Como os objetivos serão alcançados?" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="deadline" render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel className="flex items-center gap-2 text-status-warning-fg text-sm font-semibold uppercase tracking-wider">
                <Calendar className="h-4 w-4" /> Prazo para Reavaliação
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} className="bg-background border-border focus-visible:ring-status-warning-fg/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="hover:bg-muted/50">
            <X className="mr-2 h-4 w-4" /> Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="min-w-37.5 shadow-sm font-semibold">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
            {existingPaf ? 'Salvar Repactuação' : 'Finalizar PAF'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// --- SUB-COMPONENTE: VISUALIZAÇÃO ---
function DisplayPaf({ paf }: { paf: PafData }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Diagnóstico */}
      <section className="space-y-2">
        <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1 w-fit">
          <FileText className="h-4 w-4 text-primary" /> Diagnóstico
        </h4>
        <Card className="bg-muted/10 border-border/60 shadow-sm">
          <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {paf.diagnostico}
          </CardContent>
        </Card>
      </section>

      {/* Grid Objetivos e Estratégias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1 w-fit">
            <Target className="h-4 w-4 text-primary" /> Objetivos
          </h4>
          <Card className="h-full bg-muted/10 border-border/60 shadow-sm">
            <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {paf.objetivos}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1 w-fit">
            <Lightbulb className="h-4 w-4 text-primary" /> Estratégias
          </h4>
          <Card className="h-full bg-muted/10 border-border/60 shadow-sm">
            <CardContent className="p-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {paf.estrategias}
            </CardContent>
          </Card>
        </section>
      </div>

      <Separator className="bg-border/60" />

      {/* Rodapé de Metadados */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
        <div className="flex items-center gap-2 bg-status-warning-bg text-status-warning-fg px-3 py-1.5 rounded-md border border-status-warning-border">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">Reavaliação prevista: {formatDateSafe(paf.deadline)}</span>
        </div>

        <div className="text-right text-xs text-muted-foreground space-y-1">
          <p>
            Versão Atual: <Badge variant="outline" className="ml-1 text-[10px] border-border bg-background">{paf.versaoAtual}</Badge>
          </p>
          <p>Última atualização por <strong className="text-foreground">{paf.autor?.nome || 'Sistema'}</strong> em {formatDateSafe(paf.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function PafTab({ caseData }: { caseData: CaseDetailData }) {
  const { user } = useAuth()
  const { data: paf, isLoading, isError } = usePaf(caseData.id)
  const [isEditing, setIsEditing] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // --- LÓGICA DE PERMISSÃO ---
  const currentUserId = String(user?.id || '');
  const specialistId = caseData.especialistaPAEFI?.id ? String(caseData.especialistaPAEFI.id) : null;
  const pafAuthorId = paf?.autor?.id ? String(paf.autor.id) : null;

  const isManager = user?.cargo === 'Gerente';
  const isAssignedSpecialist = currentUserId === specialistId;
  const isAuthor = currentUserId === pafAuthorId;
  const isCaseActive = caseData.status !== 'DESLIGADO';
  const isMonitoring = caseData.status === 'EM_ACOMPANHAMENTO' || caseData.status === 'EM_MONITORAMENTO';

  // Regras de Negócio
  const canCreatePaf = !paf && isMonitoring && (isAssignedSpecialist || isManager);
  const canEditPaf = paf && isCaseActive && (isAuthor || isManager || isAssignedSpecialist);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            Plano de Acompanhamento Familiar
          </h3>
          <p className="text-sm text-muted-foreground">Planejamento técnico e metas de desenvolvimento.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {paf && (
            <>
              {/* [ATUALIZADO] Botão PDF */}
              <PDFDownloadButton 
                document={<PafDoc caseData={caseData} paf={paf} />}
                fileName={`PAF_${caseData.nomeCompleto.replace(/\s+/g, '_')}_v${paf.versaoAtual || 1}.pdf`}
                label="Imprimir"
                variant="outline"
                size="sm"
              />
              
              <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)} className="gap-2">
                <History className="h-4 w-4" /> Histórico
              </Button>
            </>
          )}
          
          {canEditPaf && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" /> Repactuar
            </Button>
          )}
          
          {canCreatePaf && !isEditing && (
            <Button variant="default" size="sm" onClick={() => setIsEditing(true)} className="gap-2 shadow-sm font-semibold">
              <PlusCircle className="h-4 w-4" /> Elaborar PAF
            </Button>
          )}
        </div>
      </div>

      {/* Corpo da Aba */}
      {/* [CORREÇÃO TAILWIND] min-h-[300px] -> min-h-75 */}
      <div className="min-h-75">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            <p className="text-sm uppercase tracking-widest">Carregando plano...</p>
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar</AlertTitle>
            <AlertDescription>Não foi possível recuperar os dados do PAF. Tente novamente mais tarde.</AlertDescription>
          </Alert>
        ) : (
          <>
            {isEditing ? (
              <PafForm caseId={caseData.id} existingPaf={paf || null} onClose={() => setIsEditing(false)} />
            ) : paf ? (
              <DisplayPaf paf={paf} />
            ) : (
              // Empty State Elegante
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border/50 rounded-xl bg-muted/5 text-center px-4">
                <div className="p-4 bg-muted/20 rounded-full mb-4 border border-border/30">
                  <Lock className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h4 className="text-lg font-semibold text-foreground">Nenhum PAF Vigente</h4>
                <p className="text-sm text-muted-foreground max-w-md mt-2 mb-6 leading-relaxed">
                  {canCreatePaf 
                    ? "Este caso está pronto para receber um Plano de Acompanhamento. Clique no botão acima para iniciar."
                    : "Para elaborar um PAF, o caso deve estar em Acompanhamento e você deve ser o Técnico de Referência responsável."}
                </p>
                {canCreatePaf && (
                  <Button onClick={() => setIsEditing(true)} className="shadow-sm font-semibold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Iniciar Elaboração
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <PafHistoryModal caseId={caseData.id} isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
    </div>
  )
}