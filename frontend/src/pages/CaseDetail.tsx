// frontend/src/pages/CaseDetail.tsx
import { useState, Suspense, useMemo } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft, Calendar, FileText, AlertTriangle,
  Paperclip, LayoutDashboard, Edit, ShieldCheck, Network, 
  Users, PackageCheck, Loader2, ClipboardList, 
  Link as LinkIcon, BadgeDollarSign, Bookmark, Mail,
  User, MessageCircle
} from "lucide-react" 
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { api } from '@/lib/api'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { CaseStatusBadge } from "@/components/case/CaseStatusBadge"
import { formatCPF, formatPhone } from '@/utils/formatters'
import { getUrgencyColor } from '@/constants/cases/styles'

import { PDFDownloadButton } from '@/components/reports/PDFDownloadButton'
import { CaseDoc } from '@/components/reports/templates/CaseDoc'

import { OverviewTab } from '@/components/case/tabs/OverviewTab'
import { ReferralsTab } from '@/components/case/tabs/ReferralsTab'
import { FamilyTab } from '@/components/case/tabs/FamilyTab'
import { DeliverablesTab } from '@/components/case/tabs/DeliverablesTab'
import { AppointmentsTab } from "@/components/case/tabs/AppointmentsTab"
import { InstrumentalsTab } from "@/components/case/tabs/InstrumentalsTab" 
import { EvolutionsTab } from "@/components/case/tabs/EvolutionsTab"
import { AttachmentsTab } from "@/components/case/tabs/AttachmentsTab"
import { CaseHistory as HistoryTab } from "@/components/case/tabs/HistoryTab"

import { CaseForm } from '@/components/case/CaseForm'
import { CloseCaseModal } from '@/components/modals/CloseCaseModal'
import { CaseWorkflow } from "@/components/case/CaseWorkflow"
import { CaseActions } from "@/components/case/CaseActions"

import type { CaseDetailData } from '@/types/case'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

function InfoCard({ icon: Icon, label, children }: any) {
  return (
    <Card className="shadow-sm border-l-2 border-l-primary/20">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-muted rounded-full shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
          <div className="text-sm">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-125 rounded-xl" />
    </div>
  )
}

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)

  const { data: caso, isLoading, isError, refetch } = useQuery<CaseDetailData>({
    queryKey: ["case", id],
    queryFn: async () => (await api.get(`/cases/${id}`)).data,
    enabled: !!id,
    retry: 1
  })

  // Identifica o telefone principal para o Header
  const displayPhone = useMemo(() => {
     if (!caso) return null;
     if (caso.telefone) return caso.telefone;
     if (caso.contatos && Array.isArray(caso.contatos) && caso.contatos.length > 0) {
        const main = caso.contatos.find((c: any) => ['Celular', 'Principal', 'Pessoal'].includes(c.tipo));
        return main ? main.numero : caso.contatos[0].numero;
     }
     return null;
  }, [caso]);

  // Função para abrir o WhatsApp
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) { 
      const message = encodeURIComponent("Olá! Aqui é da equipe técnica do CREAS Brazlândia. ");
      window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
    }
  }

  if (isLoading) return <DetailSkeleton />
  
  if (isError || !caso || !id) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="p-4 bg-muted/30 rounded-full border border-border shadow-sm">
         <AlertTriangle className="h-10 w-10 text-orange-500" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Caso não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível carregar os dados deste prontuário.</p>
      </div>
      <Button variant="outline" onClick={() => navigate("/cases")} className="mt-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Lista
      </Button>
    </div>
  )

  const handleTabChange = (val: string) => {
    setSearchParams(prev => { 
      prev.set('tab', val)
      return prev 
    }, { replace: true })
  }

  return (
    <div className="container mx-auto max-w-7xl pb-10 space-y-6 animate-in fade-in duration-500 px-4 md:px-8 pt-6">
      
      {/* 1. Header Unificado */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" size="sm" 
            className="-ml-2 text-muted-foreground hover:text-foreground p-0 px-2 h-8" 
            onClick={() => navigate('/cases')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
              <PDFDownloadButton 
                document={<CaseDoc data={caso} />}
                fileName={`Prontuario_${caso.nomeCompleto.replace(/\s+/g, '_')}.pdf`}
                label="Gerar PDF"
                variant="outline"
                size="sm"
              />
              <Button variant="default" size="sm" onClick={() => setIsEditOpen(true)} className="h-8 text-xs font-medium px-3 shadow-sm bg-primary hover:bg-primary/90">
                 <Edit className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start border-b border-border/40 pb-6">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 flex items-center justify-center text-3xl font-bold shrink-0 border border-blue-200/50 dark:border-blue-800/50 select-none shadow-sm ring-1 ring-background">
             {caso.nomeCompleto.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">{caso.nomeCompleto}</h1>
              
              {caso.manterReferencia && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1.5 shadow-sm">
                  <Bookmark className="h-3 w-3 fill-current" />
                  Família Referenciada
                </Badge>
              )}

              {/* [CORREÇÃO] Badge de Urgência alinhado com o CaseTable (Removido o text-white forçado) */}
              {caso.urgencia && (
                  <Badge className={cn("shadow-sm font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5", getUrgencyColor(caso.urgencia))}>
                    {caso.urgencia}
                  </Badge>
              )}
              
              <CaseStatusBadge status={caso.status} />
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
               <div className="flex items-center gap-1.5 font-medium bg-muted/30 px-2 py-0.5 rounded border border-border/40">
                 <FileText className="h-3.5 w-3.5 opacity-70"/> 
                 {formatCPF(caso.cpf)}
               </div>
               
               <div className="flex items-center gap-1.5" title="Data de Entrada">
                 <Calendar className="h-3.5 w-3.5 opacity-70"/> 
                 {new Date(caso.dataEntrada).toLocaleDateString()}
               </div>

               {caso.origem && (
                 <>
                  <span className="text-border/60">|</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tracking-wide uppercase font-bold bg-muted text-muted-foreground border-border/50">
                    {caso.origem.replace('_', ' ')}
                  </Badge>
                 </>
               )}
            </div>

            {/* Linha de Contato */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-foreground/80">
              
              {displayPhone && (
                <button 
                  onClick={() => openWhatsApp(displayPhone)}
                  className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200/50 shadow-sm font-medium"
                >
                  <MessageCircle className="h-3.5 w-3.5 fill-emerald-100" />
                  {formatPhone(displayPhone)}
                </button>
              )}

              {caso.email && (
                <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5 text-blue-600"/>
                  <a href={`mailto:${caso.email}`} className="hover:underline decoration-blue-600/50 underline-offset-4">
                    {caso.email}
                  </a>
                </div>
              )}

              {caso.responsavelLegal && (
                <>
                  <span className="hidden sm:inline text-border/60">|</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <User className="h-3.5 w-3.5 text-purple-600"/>
                          <span className="font-medium">Responsável:</span> {caso.responsavelLegal.split(' ')[0]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Responsável Legal: <strong>{caso.responsavelLegal}</strong></p>
                        {caso.parentescoResponsavel && <p className="text-xs capitalize">Vínculo: {caso.parentescoResponsavel.toLowerCase()}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto mt-2 md:mt-0 self-start md:self-center">
             <CaseActions 
                caseId={caso.id} 
                status={caso.status} 
                currentSpecialistId={caso.especialistaPAEFI?.id}
                seiRespondido={!!caso.seiRespondido}
                numeroSei={caso.numeroSei}
             />
          </div>
        </div>
      </div>

      <CaseWorkflow status={caso.status} />

      {caso.casoPrincipal && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
          <LinkIcon className="h-4 w-4" />
          <AlertTitle className="ml-2 font-bold text-sm">Vínculo Familiar Ativo</AlertTitle>
          <AlertDescription className="ml-2 text-xs">
            Este prontuário está vinculado ao caso principal de <strong>{caso.casoPrincipal.nomeCompleto}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard icon={LayoutDashboard} label="Status Atual">
          <CaseStatusBadge status={caso.status} />
        </InfoCard>
        
        <InfoCard icon={User} label="Técnico Responsável">
          <div className="flex flex-col">
            <span className="font-medium truncate">{caso.especialistaPAEFI?.nome || 'Não atribuído'}</span>
            <span className="text-[10px] text-muted-foreground uppercase">Referência PAEFI</span>
          </div>
        </InfoCard>

        <InfoCard icon={Calendar} label="Tempo de Acompanhamento">
          <div className="flex flex-col">
            <span className="font-medium">
              {new Date(caso.dataEntrada).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">Data de Entrada</span>
          </div>
        </InfoCard>

        <InfoCard icon={BadgeDollarSign} label="Renda Per Capita">
          <div className="flex flex-col">
            <span className="font-medium font-mono text-status-success-fg">
              {caso.dadosEconomicos?.rendaPerCapita?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {caso.dadosEconomicos?.numeroPessoas || 1} Pessoa(s)
            </span>
          </div>
        </InfoCard>
      </div>

      {/* Abas Full Width */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md py-3 border-b border-border w-full -mx-4 px-4 md:mx-0 md:px-0 transition-all">
          <TabsList className="bg-transparent h-auto p-0 w-full justify-start overflow-x-auto no-scrollbar flex gap-2 pb-1">
            {[
              { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'evolutions', label: 'Evoluções', icon: FileText },
              { id: 'family', label: 'Família', icon: Users },
              { id: 'instrumentals', label: 'Instrumentais (PAF)', icon: ClipboardList }, 
              { id: 'appointments', label: 'Agenda', icon: Calendar },
              { id: 'deliverables', label: 'Benefícios', icon: PackageCheck },
              { id: 'referrals', label: 'Rede', icon: Network },
              { id: 'attachments', label: 'Anexos', icon: Paperclip },
              { id: 'history', label: 'Auditoria', icon: ShieldCheck },
            ].map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className={cn(
                  "rounded-full border border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 select-none",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 data-[state=active]:shadow-sm",
                  "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95"
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6 min-h-125">
            <Suspense fallback={<DetailSkeleton />}>
              <TabsContent value="overview" className="mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <OverviewTab caseData={caso} />
              </TabsContent>
              
              <TabsContent value="evolutions" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <EvolutionsTab caseId={id} />
              </TabsContent>

              <TabsContent value="family" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <FamilyTab 
                  caseId={id} 
                  caseName={caso.nomeCompleto}
                  titularRenda={Number(caso.renda) || 0}
                  casoPrincipal={caso.casoPrincipal}
                  casosVinculados={caso.casosVinculados}
                />
              </TabsContent>
              
              <TabsContent value="instrumentals" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <InstrumentalsTab caseId={id} caseData={caso} />
              </TabsContent>

              <TabsContent value="deliverables" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <DeliverablesTab caseId={id} />
              </TabsContent>

              <TabsContent value="referrals" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ReferralsTab caseId={id} />
              </TabsContent>

              <TabsContent value="attachments" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AttachmentsTab caseId={id} onError={() => {}} />
              </TabsContent>

              <TabsContent value="history" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <HistoryTab caseId={id} showOnlyLogs />
              </TabsContent>
              
              <TabsContent value="appointments" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AppointmentsTab 
                  caseId={id} 
                  caseName={caso.nomeCompleto} 
                  phone={caso.telefone}
                />
              </TabsContent>
            </Suspense>
        </div>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border border-border shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
               <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20"><Edit className="h-5 w-5 text-primary"/></div>
               Editar Prontuário
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <Suspense fallback={<div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm">Carregando formulário...</p></div>}>
              <CaseForm initialData={caso} caseId={id} onCaseCreated={() => {setIsEditOpen(false); refetch()}} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      <CloseCaseModal 
        caseId={id!} 
        isOpen={isCloseModalOpen} 
        onOpenChange={setIsCloseModalOpen}
        numeroSei={caso.numeroSei}
        seiRespondido={!!caso.seiRespondido}
      />
    </div>
  )
}