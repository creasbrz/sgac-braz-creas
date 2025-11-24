// frontend/src/pages/CaseDetail.tsx
import { useParams } from "react-router-dom"
import { ExternalLink, FileText } from "lucide-react"
import { clsx } from "clsx"
import { toast } from "sonner"

import { getCaseStatusInfo } from "@/constants/caseConstants"
import { useCaseDetail, useEvolutions, usePaf } from "@/hooks/api/useCaseQueries"
import { formatCPF, formatPhone, formatDateSafe } from "@/utils/formatters"
import { generateCasePDF } from "@/utils/pdfGenerator"

import { CaseActions } from "@/components/case/CaseActions"
import { PafSection } from "@/components/case/PafSection"
import { EvolutionsSection } from "@/components/case/EvolutionsSection"
import { DetailField } from "@/components/case/DetailField"
import { DetailSkeleton } from "@/components/case/DetailSkeleton"
import { CaseHistory } from "@/components/case/CaseHistory"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()

  // 1. Carregamos todos os dados necessários
  const { data: caseDetail, isLoading: loadingCase, isError } = useCaseDetail(id)
  const { data: evolutions } = useEvolutions(id)
  const { data: paf } = usePaf(id)

  // 2. Tratamento de Estados
  if (!id) {
    return <p className="text-center text-destructive mt-8">ID de caso inválido.</p>
  }

  if (loadingCase) {
    return <DetailSkeleton />
  }

  if (isError || !caseDetail) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-center p-8">
        <div>
          <h2 className="text-xl font-bold text-destructive mb-2">Erro ao carregar o caso.</h2>
          <p className="text-muted-foreground">
            O caso pode não existir ou ocorreu um erro de conexão com o servidor.
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = getCaseStatusInfo(caseDetail.status)

  // 3. Função para Gerar o PDF
  const handleExportPdf = () => {
    try {
      const dataForPdf = {
        ...caseDetail,
        evolutions: evolutions || [],
        pafData: paf || null
      }
      
      generateCasePDF(dataForPdf)
      toast.success("Prontuário gerado com sucesso!")
    } catch (error) {
      console.error(error)
      toast.error("Falha ao gerar o arquivo PDF.")
    }
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">

      {/* ———————————————— CABEÇALHO PRINCIPAL ———————————————— */}
      <div className="border-b pb-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10 pt-2">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {caseDetail.nomeCompleto}
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={clsx("border-transparent px-2 py-0.5", statusInfo.style)}>
                {statusInfo.text}
              </Badge>

              <span className="text-sm text-muted-foreground border-l pl-3 ml-1">
                Criado por: <span className="font-medium text-foreground">{caseDetail.criadoPor?.nome ?? 'Sistema'}</span>
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleExportPdf}
            className="shrink-0 gap-2 shadow-sm hover:bg-accent/50"
          >
            <FileText className="h-4 w-4" />
            Imprimir Prontuário
          </Button>
        </div>

        <CaseActions caseData={caseDetail} />
      </div>

      {/* ———————————————— SISTEMA DE ABAS ———————————————— */}
      <Tabs defaultValue="prontuario" className="w-full">
        
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-[500px] grid-cols-2">
            <TabsTrigger value="prontuario">Prontuário & Atendimento</TabsTrigger>
            <TabsTrigger value="historico">Histórico do Sistema</TabsTrigger>
          </TabsList>
        </div>

        {/* === ABA 1: PRONTUÁRIO TÉCNICO === */}
        <TabsContent value="prontuario" className="space-y-6 focus-visible:outline-none">
          
          {/* BLOCO DE INFORMAÇÕES PESSOAIS */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-base font-semibold mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"/> 
              Informações Pessoais
            </h3>
            
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <DetailField label="Nome Completo" value={caseDetail.nomeCompleto} />
              <DetailField label="CPF" value={formatCPF(caseDetail.cpf)} />
              <DetailField label="Data de Nascimento" value={formatDateSafe(caseDetail.nascimento)} />
              <DetailField label="Sexo" value={caseDetail.sexo} />
              <DetailField label="Telefone" value={formatPhone(caseDetail.telefone)} />
              <DetailField label="Endereço" value={caseDetail.endereco} className="lg:col-span-2" />
            </dl>
          </div>

          {/* BLOCO DE DETALHES DO CASO */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-base font-semibold mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"/> 
              Detalhes do Atendimento
            </h3>

            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <DetailField label="Data de Entrada" value={formatDateSafe(caseDetail.dataEntrada)} />
              <DetailField label="Nível de Urgência" value={caseDetail.urgencia} />
              <DetailField label="Violação de Direito" value={caseDetail.violacao} />
              <DetailField label="Categoria" value={caseDetail.categoria} />
              <DetailField label="Órgão Demandante" value={caseDetail.orgaoDemandante} />
              
              <DetailField 
                label="Agente Social (Acolhida)" 
                value={caseDetail.agenteAcolhida?.nome ?? <span className="text-muted-foreground italic">Não atribuído</span>} 
              />
              
              <DetailField 
                label="Especialista PAEFI" 
                value={caseDetail.especialistaPAEFI?.nome ?? <span className="text-muted-foreground italic">Não atribuído</span>} 
              />
              
              <DetailField label="Número do SEI" value={caseDetail.numeroSei ?? '-'} />
              
              <DetailField
                label="Link do SEI"
                value={
                  caseDetail.linkSei ? (
                    <a
                      href={caseDetail.linkSei}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline hover:text-primary/80 transition-colors font-medium"
                    >
                      Abrir no SEI <ExternalLink size={14} />
                    </a>
                  ) : '-'
                }
              />

              <div className="lg:col-span-3">
                <DetailField
                  label="Observações Iniciais"
                  value={caseDetail.observacoes ?? '-'}
                />
              </div>

              {/* [CORREÇÃO 1] Uso de Optional Chaining (?.) e fallback para array vazio */}
              <div className="lg:col-span-3 pt-2">
                <DetailField
                  label="Benefícios Registrados"
                  value={
                    (caseDetail.beneficios?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {caseDetail.beneficios!.map((b) => (
                          <Badge key={b} variant="secondary" className="text-xs px-2 py-0.5">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhum benefício vinculado.</span>
                    )
                  }
                />
              </div>

              {caseDetail.status === 'DESLIGADO' && (
                <div className="lg:col-span-3 mt-4 pt-6 border-t border-border/50 bg-destructive/5 -mx-6 px-6 pb-2">
                  <h4 className="text-sm font-bold text-destructive mb-4 uppercase tracking-wider">Dados do Desligamento</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DetailField label="Motivo" value={caseDetail.motivoDesligamento ?? '-'} />
                    <DetailField label="Parecer Final" value={caseDetail.parecerFinal ?? '-'} />
                  </div>
                </div>
              )}
            </dl>
          </div>

          <PafSection caseData={caseDetail} />
          <EvolutionsSection caseId={caseDetail.id} />
        </TabsContent>

        {/* === ABA 2: HISTÓRICO DO SISTEMA === */}
        {/* [CORREÇÃO 2] Fallback para array vazio caso logs seja undefined */}
        <TabsContent value="historico" className="mt-6 focus-visible:outline-none">
          <CaseHistory logs={caseDetail.logs ?? []} />
        </TabsContent>

      </Tabs>
    </div>
  )
}