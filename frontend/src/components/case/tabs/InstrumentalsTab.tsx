// frontend/src/components/case/tabs/InstrumentalsTab.tsx
// frontend/src/components/case/tabs/InstrumentalsTab.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { 
  FileText, Save, History, Printer, FileOutput, 
  CheckCircle2, AlertCircle, Loader2, Calendar, Archive
} from 'lucide-react'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form'

import { OPTIONS } from '@/constants/options'
import { TechnicalReportDoc } from '@/components/reports/templates/TechnicalReportDoc'

// --- SCHEMAS E TIPOS ---

const pafSchema = z.object({
  diagnostico: z.string().min(10, 'O diagnóstico deve ser detalhado.'),
  objetivos: z.string().min(5, 'Defina os objetivos do acompanhamento.'),
  estrategias: z.string().min(5, 'Descreva as estratégias de intervenção.'),
  deadline: z.string().min(1, 'Data de reavaliação obrigatória.'),
  entregas: z.array(z.string()).default([])
})

type PafFormData = z.infer<typeof pafSchema>

interface InstrumentalsTabProps {
  caseId: string
  caseData?: any
}

export function InstrumentalsTab({ caseId, caseData }: InstrumentalsTabProps) {
  const queryClient = useQueryClient()
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<string | null>(null)

  // 1. Buscar Dados do PAF Atual e Histórico
  const { data: pafHistory, isLoading: isLoadingPaf } = useQuery({
    queryKey: ['paf', 'history', caseId],
    queryFn: async () => (await api.get(`/instrumentals/paf/history/${caseId}`)).data
  })

  // 2. Buscar Histórico de Documentos
  const { data: docsHistory, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: async () => (await api.get(`/instrumentals/documents/${caseId}`)).data
  })

  const currentPaf = pafHistory?.find((p: any) => p.isCurrent)

  // 3. Configuração do Formulário
  const form = useForm<PafFormData>({
    resolver: zodResolver(pafSchema) as any,
    defaultValues: {
      diagnostico: '',
      objetivos: '',
      estrategias: '',
      deadline: '',
      entregas: []
    },
    values: currentPaf ? {
      diagnostico: currentPaf.diagnostico,
      objetivos: currentPaf.objetivos,
      estrategias: currentPaf.estrategias,
      deadline: currentPaf.deadline ? currentPaf.deadline.split('T')[0] : '',
      entregas: [] 
    } : undefined
  })

  // 4. Mutation: Salvar PAF
  const { mutate: savePaf, isPending: isSaving } = useMutation({
    mutationFn: async (data: PafFormData) => {
      const payload = {
        ...data,
        caseId,
        deadline: new Date(data.deadline).toISOString()
      }
      await api.post('/instrumentals/paf', payload)
    },
    onSuccess: () => {
      toast.success('Plano de Acompanhamento (PAF) atualizado!')
      queryClient.invalidateQueries({ queryKey: ['paf', 'history', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] }) 
    },
    onError: () => toast.error('Erro ao salvar o PAF.')
  })

  // 5. Mutation: Gerar Documento (PDF + Registro)
  const { mutate: generateDoc } = useMutation({
    mutationFn: async (tipo: string) => {
      setIsGeneratingDoc(tipo)
      
      const pafData = form.getValues()
      
      // A. Gerar o PDF no Cliente
      const blob = await pdf(
        <TechnicalReportDoc 
          type={tipo} 
          caseData={caseData} 
          pafData={pafData} 
          // Idealmente pegar do contexto de auth
          authorName="Técnico Responsável" 
        />
      ).toBlob()

      // B. Salvar registro no Backend (Histórico)
      await api.post('/instrumentals/documents', {
        caseId,
        tipo,
        conteudo: {
          generatedAt: new Date(),
          snapshot: {
            nome: caseData?.nomeCompleto,
            cpf: caseData?.cpf,
            paf: pafData
          }
        }
      })

      // C. Baixar o arquivo
      const fileName = `${tipo}_${caseData?.nomeCompleto?.split(' ')[0]}_${format(new Date(), 'dd-MM')}.pdf`
      saveAs(blob, fileName)
    },
    onSuccess: (_, variables) => { // 'variables' aqui é o 'tipo' passado na mutation
      // Usando a variável para evitar o erro TS6133
      const tipoFormatado = variables.replace(/_/g, ' ')
      toast.success(`Documento "${tipoFormatado}" emitido com sucesso!`)
      
      queryClient.invalidateQueries({ queryKey: ['documents', caseId] })
      setIsGeneratingDoc(null)
    },
    onError: () => {
      toast.error('Erro ao gerar documento.')
      setIsGeneratingDoc(null)
    }
  })

  const onSubmit = (data: PafFormData) => savePaf(data)

  // --- RENDER ---

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500 pb-8">
      
      {/* COLUNA ESQUERDA: FORMULÁRIO PAF (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="pb-4 bg-muted/5 border-b border-border/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-600" /> 
                  Plano de Acompanhamento Familiar (PAF)
                </CardTitle>
                <CardDescription>
                  Planejamento técnico, metas e estratégias de intervenção.
                </CardDescription>
              </div>
              {currentPaf && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Versão {currentPaf.versaoNumero}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="diagnostico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Diagnóstico Situacional</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Descreva a situação de vulnerabilidade, risco e potencialidades da família..." 
                          className="min-h-30 bg-background leading-relaxed" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="objetivos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Objetivos</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Objetivos a serem alcançados..." 
                            className="min-h-25 bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estrategias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Estratégias</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Ações e encaminhamentos previstos..." 
                            className="min-h-25 bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* CHECKLIST DE ENTREGAS/BENEFÍCIOS */}
                <div className="space-y-3">
                  <Label className="font-semibold text-foreground flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-green-600" /> 
                    Benefícios e Entregas Realizadas neste Ciclo
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1 mb-2">
                    Marque os itens que foram viabilizados/concedidos durante esta etapa do acompanhamento.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {OPTIONS.transferenciaRenda.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="entregas"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-muted/50 transition-colors"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || []
                                    return checked
                                      ? field.onChange([...current, item])
                                      : field.onChange(current.filter((value) => value !== item))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm cursor-pointer w-full">
                                {item}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t items-end sm:items-center justify-between">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2 w-full sm:w-auto">
                        <FormLabel>Data de Reavaliação</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="w-full sm:w-48 bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSaving} className="w-full sm:w-auto min-w-40 font-semibold shadow-md">
                    {isSaving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Salvar / Repactuar</>
                    )}
                  </Button>
                </div>

              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* COLUNA DIREITA: AÇÕES E HISTÓRICO (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Painel de Emissão de Documentos */}
        <Card className="shadow-sm bg-muted/10 border-dashed border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Printer className="h-4 w-4" /> Emissão de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start bg-background hover:bg-white hover:border-primary/50 transition-all"
              onClick={() => generateDoc('RELATORIO_SOCIO')}
              disabled={!!isGeneratingDoc}
            >
              {isGeneratingDoc === 'RELATORIO_SOCIO' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileOutput className="mr-2 h-4 w-4 text-blue-600"/>}
              Relatório Socioassistencial
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-background hover:bg-white hover:border-primary/50 transition-all"
              onClick={() => generateDoc('RELATORIO_INFORMATIVO')}
              disabled={!!isGeneratingDoc}
            >
              {isGeneratingDoc === 'RELATORIO_INFORMATIVO' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileOutput className="mr-2 h-4 w-4 text-amber-600"/>}
              Relatório Informativo
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start bg-background hover:bg-white hover:border-primary/50 transition-all"
              onClick={() => generateDoc('SOLICITACAO_ACOLHIMENTO')}
              disabled={!!isGeneratingDoc}
            >
              {isGeneratingDoc === 'SOLICITACAO_ACOLHIMENTO' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileOutput className="mr-2 h-4 w-4 text-red-600"/>}
              Solicitação de Acolhimento
            </Button>
          </CardContent>
        </Card>

        {/* Histórico Unificado (PAF + Docs) */}
        <Card className="h-125 flex flex-col shadow-sm">
          <CardHeader className="pb-3 bg-muted/5 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col p-4 gap-4">
                
                {isLoadingPaf || isLoadingDocs ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {docsHistory?.map((doc: any) => (
                      <div key={doc.id} className="flex gap-3 text-sm relative group">
                        <div className="absolute left-2.75 top-8 -bottom-5 w-px bg-border group-last:hidden"></div>
                        <div className="mt-1 h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 z-10">
                          <Printer className="h-3 w-3 text-slate-500" />
                        </div>
                        <div className="pb-1">
                          <p className="font-medium text-foreground">
                            {doc.tipo.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" /> {format(new Date(doc.createdAt), "dd/MM/yy 'às' HH:mm")} • {doc.autor?.nome.split(' ')[0]}
                          </p>
                        </div>
                      </div>
                    ))}

                    {pafHistory?.filter((p: any) => !p.isCurrent).map((p: any) => (
                      <div key={p.id} className="flex gap-3 text-sm relative group">
                        <div className="absolute left-2.75 top-8 -bottom-5 w-px bg-border group-last:hidden"></div>
                        <div className="mt-1 h-6 w-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 z-10">
                          <Archive className="h-3 w-3 text-blue-600" />
                        </div>
                        <div className="pb-1">
                          <p className="font-medium text-foreground">
                            PAF Versão {p.versaoNumero || '?'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" /> {format(new Date(p.savedAt), "dd/MM/yy 'às' HH:mm")} • {p.autor?.nome.split(' ')[0]}
                          </p>
                        </div>
                      </div>
                    ))}

                    {(!docsHistory?.length && (!pafHistory || pafHistory.length <= 1)) && (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Nenhum histórico registrado.
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}